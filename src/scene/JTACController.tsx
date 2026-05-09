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
    camera.lookAt(0, 0, 0);
    if ('isPerspectiveCamera' in camera && (camera as { isPerspectiveCamera?: boolean }).isPerspectiveCamera) {
      const persp = camera as unknown as { fov: number; updateProjectionMatrix: () => void };
      persp.fov = 60;
      persp.updateProjectionMatrix();
    }
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
