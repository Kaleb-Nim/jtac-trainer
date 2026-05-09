'use client';

import { TARGET_WORLD } from '@/lib/positions';
import { terrainHeight } from './terrainProfile';

export default function Target() {
  const groundY = terrainHeight(TARGET_WORLD.x, TARGET_WORLD.z);
  const wheelZ = [-3.3, -1.9, -0.55, 0.8, 2.15, 3.45];

  return (
    <group position={[TARGET_WORLD.x, groundY, TARGET_WORLD.z]} rotation={[0, -0.28, 0]}>
      <mesh position={[0, 1.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.8, 1.35, 8.9]} />
        <meshStandardMaterial color="#535f43" roughness={0.88} metalness={0.08} />
      </mesh>
      <mesh position={[0, 2.08, -0.6]} castShadow receiveShadow>
        <boxGeometry args={[3.15, 0.8, 2.9]} />
        <meshStandardMaterial color="#46533b" roughness={0.86} metalness={0.08} />
      </mesh>
      <mesh position={[0, 2.12, -3.35]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.19, 4.4, 14]} />
        <meshStandardMaterial color="#2d322b" roughness={0.82} metalness={0.18} />
      </mesh>
      <mesh position={[0, 2.52, 1.15]} castShadow>
        <boxGeometry args={[1.2, 0.25, 1]} />
        <meshStandardMaterial color="#252a24" roughness={0.75} metalness={0.1} />
      </mesh>
      <mesh position={[0, 2.55, -1.65]} castShadow>
        <boxGeometry args={[0.95, 0.06, 0.72]} />
        <meshStandardMaterial color="#b2322a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.8, 0.72, 9.7]} />
        <meshStandardMaterial color="#242720" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.68, 2.25]} castShadow>
        <boxGeometry args={[3.6, 0.34, 2.2]} />
        <meshStandardMaterial color="#68724e" roughness={0.9} />
      </mesh>
      {wheelZ.map((z) => (
        <group key={z}>
          <mesh position={[-2.95, 0.62, z]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[0.52, 0.52, 0.44, 18]} />
            <meshStandardMaterial color="#151713" roughness={0.92} />
          </mesh>
          <mesh position={[2.95, 0.62, z]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[0.52, 0.52, 0.44, 18]} />
            <meshStandardMaterial color="#151713" roughness={0.92} />
          </mesh>
        </group>
      ))}
      <mesh position={[-2.92, 0.62, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.42, 8.8]} />
        <meshStandardMaterial color="#303329" roughness={0.94} />
      </mesh>
      <mesh position={[2.92, 0.62, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.42, 8.8]} />
        <meshStandardMaterial color="#303329" roughness={0.94} />
      </mesh>
    </group>
  );
}
