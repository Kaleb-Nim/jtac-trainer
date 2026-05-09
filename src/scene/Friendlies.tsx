'use client';

import { Billboard } from '@react-three/drei';
import { FRIENDLIES_WORLD } from '@/lib/positions';

// MOVED z=1000 → z=320 in Phase 3 per SCENARIO reconciliation
// (.planning/phases/03-jtac-pilot-persona-grid-bridge/03-SCENARIO.md §3).
// At z=1000 the prop sat 500 m off the ground plane and the Take-B misread
// could not produce an "unsafe" verdict; at z=320 a single-digit misread on
// line 6 of the 9-line lands the bomb ~20 m from this position.
export default function Friendlies() {
  return (
    <Billboard position={[FRIENDLIES_WORLD.x, FRIENDLIES_WORLD.y, FRIENDLIES_WORLD.z]}>
      <mesh>
        <octahedronGeometry args={[2]} />
        <meshStandardMaterial color="#3498db" />
      </mesh>
    </Billboard>
  );
}
