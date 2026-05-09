'use client';

export default function Terrain() {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[1000, 1000, 1, 1]} />
      <meshStandardMaterial color="#3b5d3a" />
    </mesh>
  );
}
