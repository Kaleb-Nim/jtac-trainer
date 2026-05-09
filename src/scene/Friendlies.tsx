'use client';

import { Billboard } from '@react-three/drei';

export default function Friendlies() {
  return (
    <Billboard position={[100, 2, 1000]}>
      <mesh>
        <octahedronGeometry args={[2]} />
        <meshStandardMaterial color="#3498db" />
      </mesh>
    </Billboard>
  );
}
