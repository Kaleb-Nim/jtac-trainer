'use client';

import { useEffect, useRef } from 'react';
import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Raycaster, Plane, Vector3 } from 'three';
import { useStore } from '@/lib/store';
import { worldToGrid } from '@/lib/grid';

export default function JTACController() {
  const { camera } = useThree();
  const frameCounterRef = useRef(0);
  const raycasterRef = useRef(new Raycaster());
  const planeRef = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const dirRef = useRef(new Vector3());
  const targetRef = useRef(new Vector3());
  const originRef = useRef(new Vector3());

  useEffect(() => {
    camera.position.set(0, 30, 80);
    // Phase 3 SCENARIO nudge: aim the initial gaze at the BTR (100,1,200)
    // so the user has the target on-screen at first frame instead of empty
    // terrain (was lookAt(0,0,0) which faced -Z and put the BTR behind-right).
    camera.lookAt(100, 1, 200);
    if ('isPerspectiveCamera' in camera && (camera as { isPerspectiveCamera?: boolean }).isPerspectiveCamera) {
      const persp = camera as unknown as { fov: number; updateProjectionMatrix: () => void };
      persp.fov = 60;
      persp.updateProjectionMatrix();
    }
  }, [camera]);

  // L-key lase + R-key reset (Phase 3 / SCENARIO insertion).
  // Reuses the existing raycaster/plane/dir/target/origin refs so the lase
  // path doesn't allocate new Vector3s per keypress.
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    const ensureAudio = (): AudioContext | null => {
      if (audioCtx) return audioCtx;
      try {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        audioCtx = new Ctor();
        return audioCtx;
      } catch {
        return null;
      }
    };
    const ping = () => {
      const ctx = ensureAudio();
      if (!ctx || ctx.state === 'suspended') return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 1200;
        gain.gain.value = 0.08;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } catch {
        // WebAudio failures are non-fatal; demo continues without ping.
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'l') {
        camera.getWorldPosition(originRef.current);
        camera.getWorldDirection(dirRef.current);
        raycasterRef.current.set(originRef.current, dirRef.current);
        const hit = raycasterRef.current.ray.intersectPlane(planeRef.current, targetRef.current);
        if (hit) {
          const range = camera.position.distanceTo(targetRef.current);
          useStore.getState().setLasedRange(range);
          useStore.getState().setLasePulseAt(Date.now());
          ping();
        }
      } else if (k === 'r') {
        useStore.getState().endRun();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (audioCtx) {
        try { audioCtx.close(); } catch { /* noop */ }
        audioCtx = null;
      }
    };
  }, [camera]);

  useFrame(() => {
    frameCounterRef.current = (frameCounterRef.current + 1) % 6;
    if (frameCounterRef.current !== 0) return;

    camera.getWorldPosition(originRef.current);
    camera.getWorldDirection(dirRef.current);
    raycasterRef.current.set(originRef.current, dirRef.current);

    const hit = raycasterRef.current.ray.intersectPlane(planeRef.current, targetRef.current);
    if (hit) {
      const grid = worldToGrid(hit.x, hit.z);
      if (grid !== useStore.getState().reticleGrid) {
        useStore.getState().setReticleGrid(grid);
      }
    }
  });

  return <PointerLockControls />;
}
