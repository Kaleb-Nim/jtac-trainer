'use client';

// TODO Phase 5: replace with GLB tank from Poly Pizza CC0.
export default function Target() {
  return (
    <mesh position={[100, 1, 200]} castShadow>
      <boxGeometry args={[3, 2, 5]} />
      <meshStandardMaterial color="#c0392b" />
    </mesh>
  );
}
