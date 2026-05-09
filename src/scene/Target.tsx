'use client';

import { TARGET_WORLD } from '@/lib/positions';

// TODO Phase 5: replace with GLB tank from Poly Pizza CC0.
export default function Target() {
  return (
    <mesh position={[TARGET_WORLD.x, TARGET_WORLD.y, TARGET_WORLD.z]} castShadow>
      <boxGeometry args={[3, 2, 5]} />
      <meshStandardMaterial color="#c0392b" />
    </mesh>
  );
}
