'use client';

// BombImpact — Phase 3 / PILOT-05.
// Subscribes to the Zustand `transmittedGrid`. On a new non-null value:
//   delay (1.0s) → falling sphere (0.8s, eased) → impact (orange ring + smoke)
//   → cooldown → idle. At impact, writes a typed ImpactResult to the store
//   for Phase 4 debrief consumption.
// On `transmittedGrid` → null (R-key reset), immediately hides all effects
// and clears the lastHandled latch so a subsequent re-trigger works.
//
// Dev hooks (NODE_ENV !== 'production'): exposes window.__setTransmittedGrid,
// window.__getImpactResult, window.__getStore for the bomb-smoke regression
// to drive the component without going through ws-server.

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { useStore } from '@/lib/store';
import { gridToWorld } from '@/lib/grid';
import { TARGET_WORLD, FRIENDLIES_WORLD } from '@/lib/positions';

type Phase = 'idle' | 'delay' | 'falling' | 'impact' | 'cooldown';

const DROP_DELAY_S = 1.0;
const FALL_DURATION_S = 0.8;
const FALL_FROM_Y = 200;
const RING_DURATION_S = 1.2;
const RING_R0 = 1;
const RING_R1 = 25;
const SMOKE_DURATION_S = 2.0;
const COOLDOWN_AFTER_IMPACT_S = 1.0;

const SMOKE_COUNT = 5;
// Per-puff offsets (small horizontal scatter), all in plane (X, Z).
const SMOKE_OFFSETS: Array<[number, number]> = [
  [0, 0],
  [2, 1],
  [-1.5, 1.8],
  [1, -2],
  [-2, -1],
];

function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export default function BombImpact() {
  const transmittedGrid = useStore((s) => s.transmittedGrid);

  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const lastHandledRef = useRef<string | null>(null);
  const startRef = useRef<number>(0); // seconds (perf.now/1000)
  const targetRef = useRef<{ x: number; z: number } | null>(null);

  const sphereRef = useRef<Mesh | null>(null);
  const ringRef = useRef<Mesh | null>(null);
  const smokeRefs = useRef<Array<Mesh | null>>([]);

  // Drive new-grid / null-reset transitions.
  useEffect(() => {
    if (transmittedGrid === null) {
      // R-key reset: hide all effect meshes, return to idle, clear latch so
      // the same grid can re-trigger after a future Take.
      setPhase('idle');
      lastHandledRef.current = null;
      targetRef.current = null;
      if (sphereRef.current) sphereRef.current.visible = false;
      if (ringRef.current) ringRef.current.visible = false;
      smokeRefs.current.forEach((m) => { if (m) m.visible = false; });
      return;
    }
    if (transmittedGrid === lastHandledRef.current) return;
    lastHandledRef.current = transmittedGrid;
    const w = gridToWorld(transmittedGrid);
    targetRef.current = { x: w.x, z: w.z };
    startRef.current = performance.now() / 1000;
    setPhase('delay');
  }, [transmittedGrid]);

  // Per-frame animation driver. All time math is local to startRef so each
  // strike is independent.
  useFrame(() => {
    const target = targetRef.current;
    const sphere = sphereRef.current;
    const ring = ringRef.current;
    if (!target) return;

    const now = performance.now() / 1000;
    const elapsed = now - startRef.current;
    const current = phaseRef.current;

    if (current === 'delay') {
      if (sphere) sphere.visible = false;
      if (ring) ring.visible = false;
      smokeRefs.current.forEach((m) => { if (m) m.visible = false; });
      if (elapsed >= DROP_DELAY_S) {
        startRef.current = now;
        setPhase('falling');
      }
      return;
    }

    if (current === 'falling' && sphere) {
      const t = Math.min(1, elapsed / FALL_DURATION_S);
      const eased = t * t; // ease-in (gravity-ish)
      const y = FALL_FROM_Y * (1 - eased);
      sphere.visible = true;
      sphere.position.set(target.x, y, target.z);
      if (t >= 1) {
        // Land — write impactResult to store.
        const impactWorld = { x: target.x, y: 0, z: target.z };
        const dToTarget = dist2(target.x, target.z, TARGET_WORLD.x, TARGET_WORLD.z);
        const dToFriendlies = dist2(target.x, target.z, FRIENDLIES_WORLD.x, FRIENDLIES_WORLD.z);
        useStore.getState().setImpactResult({
          grid: lastHandledRef.current ?? '',
          world: impactWorld,
          distanceToTarget: dToTarget,
          distanceToFriendlies: dToFriendlies,
          timestamp: Date.now(),
        });
        sphere.visible = false;
        startRef.current = now;
        setPhase('impact');
      }
      return;
    }

    if (current === 'impact' && ring) {
      const t = Math.min(1, elapsed / RING_DURATION_S);
      ring.visible = true;
      const r = RING_R0 + (RING_R1 - RING_R0) * t;
      ring.scale.setScalar(r);
      ring.position.set(target.x, 0.2, target.z);
      const mat = (ring.material as { opacity?: number; transparent?: boolean });
      if (mat) { mat.transparent = true; mat.opacity = 1 - t; }

      const sT = Math.min(1, elapsed / SMOKE_DURATION_S);
      smokeRefs.current.forEach((m, i) => {
        if (!m) return;
        m.visible = true;
        const [ox, oz] = SMOKE_OFFSETS[i] ?? [0, 0];
        const scale = 1 + 4 * sT;
        m.scale.setScalar(scale);
        m.position.set(target.x + ox, 1 + 8 * sT, target.z + oz);
        const sm = (m.material as { opacity?: number; transparent?: boolean });
        if (sm) { sm.transparent = true; sm.opacity = Math.max(0, 0.6 * (1 - sT)); }
      });

      if (elapsed >= Math.max(RING_DURATION_S, SMOKE_DURATION_S)) {
        startRef.current = now;
        setPhase('cooldown');
      }
      return;
    }

    if (current === 'cooldown') {
      if (elapsed >= COOLDOWN_AFTER_IMPACT_S) {
        if (sphere) sphere.visible = false;
        if (ring) ring.visible = false;
        smokeRefs.current.forEach((m) => { if (m) m.visible = false; });
        setPhase('idle');
      }
    }
  });

  // Dev-mode global hooks for bomb-smoke.ts to drive the component without
  // routing through ws-server. Production builds skip these entirely.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as {
      __setTransmittedGrid?: (g: string | null) => void;
      __getImpactResult?: () => unknown;
      __getStore?: () => unknown;
    };
    w.__setTransmittedGrid = (g) => useStore.getState().setTransmittedGrid(g);
    w.__getImpactResult = () => useStore.getState().impactResult;
    w.__getStore = () => useStore.getState();
    return () => {
      delete w.__setTransmittedGrid;
      delete w.__getImpactResult;
      delete w.__getStore;
    };
  }, []);

  return (
    <group>
      {/* Falling bomb (dark sphere) */}
      <mesh ref={sphereRef} visible={false} castShadow>
        <sphereGeometry args={[1.2, 12, 12]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Expanding orange impact ring (torus, flat on ground plane) */}
      <mesh ref={ringRef} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.25, 12, 32]} />
        <meshBasicMaterial color="#ff7a1a" transparent opacity={1} />
      </mesh>
      {/* Smoke puffs */}
      {Array.from({ length: SMOKE_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { smokeRefs.current[i] = el; }}
          visible={false}
        >
          <sphereGeometry args={[1.5, 8, 8]} />
          <meshStandardMaterial color="#3a3a3a" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}
