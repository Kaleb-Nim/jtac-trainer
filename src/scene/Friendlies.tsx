'use client';

import { FRIENDLIES_WORLD } from '@/lib/positions';
import { terrainHeight } from './terrainProfile';

// MOVED z=1000 → z=320 in Phase 3 per SCENARIO reconciliation
// (.planning/phases/03-jtac-pilot-persona-grid-bridge/03-SCENARIO.md §3).
// At z=1000 the prop sat 500 m off the ground plane and the Take-B misread
// could not produce an "unsafe" verdict; at z=320 a single-digit misread on
// line 6 of the 9-line lands the bomb ~20 m from this position.
type SoldierProps = {
  position: [number, number, number];
  rotation: number;
};

function Soldier({ position, rotation }: SoldierProps) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.36, 1.05, 9]} />
        <meshStandardMaterial color="#3c4a34" roughness={0.92} />
      </mesh>
      <mesh position={[0, 1.73, 0]} castShadow>
        <sphereGeometry args={[0.24, 12, 10]} />
        <meshStandardMaterial color="#2f3b2c" roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.92, 0.01]} castShadow>
        <sphereGeometry args={[0.29, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#20271f" roughness={0.86} />
      </mesh>
      <mesh position={[0, 1.88, -0.18]} castShadow>
        <boxGeometry args={[0.58, 0.08, 0.1]} />
        <meshStandardMaterial color="#2d7fb4" roughness={0.76} />
      </mesh>
      <mesh position={[-0.16, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.1, 0.78, 7]} />
        <meshStandardMaterial color="#252d23" roughness={0.9} />
      </mesh>
      <mesh position={[0.16, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.1, 0.78, 7]} />
        <meshStandardMaterial color="#252d23" roughness={0.9} />
      </mesh>
      <mesh position={[-0.42, 1.2, 0.05]} rotation={[0, 0, 0.35]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.72, 7]} />
        <meshStandardMaterial color="#33402d" roughness={0.9} />
      </mesh>
      <mesh position={[0.42, 1.2, 0.05]} rotation={[0, 0, -0.35]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.72, 7]} />
        <meshStandardMaterial color="#33402d" roughness={0.9} />
      </mesh>
      <mesh position={[0.5, 1.14, -0.22]} rotation={[0.18, 0.28, -0.2]} castShadow>
        <boxGeometry args={[0.09, 0.1, 1.15]} />
        <meshStandardMaterial color="#151713" roughness={0.84} />
      </mesh>
      <mesh position={[0, 1.38, -0.36]} castShadow>
        <boxGeometry args={[0.58, 0.62, 0.18]} />
        <meshStandardMaterial color="#30382c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.42, -0.47]} castShadow>
        <boxGeometry args={[0.62, 0.12, 0.05]} />
        <meshStandardMaterial color="#2d7fb4" roughness={0.76} />
      </mesh>
    </group>
  );
}

export default function Friendlies() {
  const groundY = terrainHeight(FRIENDLIES_WORLD.x, FRIENDLIES_WORLD.z);
  const soldiers: SoldierProps[] = [
    { position: [-2.4, 0, -1.8], rotation: -0.45 },
    { position: [1.9, 0, -1.2], rotation: 0.1 },
    { position: [-0.8, 0, 1.7], rotation: 0.55 },
    { position: [2.8, 0, 2.2], rotation: -0.15 },
  ];

  return (
    <group position={[FRIENDLIES_WORLD.x, groundY, FRIENDLIES_WORLD.z]}>
      {soldiers.map((soldier) => (
        <Soldier
          key={`${soldier.position[0]}:${soldier.position[2]}`}
          position={soldier.position}
          rotation={soldier.rotation}
        />
      ))}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[4.8, 5.15, 32]} />
        <meshBasicMaterial color="#2d7fb4" transparent opacity={0.32} />
      </mesh>
    </group>
  );
}
