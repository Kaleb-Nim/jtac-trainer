'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  Color,
  Float32BufferAttribute,
  Object3D,
  PlaneGeometry,
  type InstancedMesh,
} from 'three';
import { FRIENDLIES_WORLD, TARGET_WORLD } from '@/lib/positions';
import { TERRAIN_SIZE, scenarioClearanceAllows, terrainHeight } from './terrainProfile';

type GrassInstance = {
  x: number;
  z: number;
  scale: number;
  rotation: number;
};

type TreeInstance = GrassInstance & {
  canopyRadius: number;
  canopyHeight: number;
  trunkHeight: number;
};

type RockInstance = GrassInstance & {
  tiltX: number;
  tiltZ: number;
};

function mulberry32(seed: number) {
  return () => {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randBetween(rand: () => number, min: number, max: number): number {
  return min + (max - min) * rand();
}

function createGroundGeometry() {
  const geometry = new PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 120, 120);
  const positions = geometry.attributes.position;
  const colors: number[] = [];
  const low = new Color('#2f4d2f');
  const mid = new Color('#4e6f3d');
  const high = new Color('#6d7748');
  const scratch = new Color();

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const localY = positions.getY(i);
    const z = -localY;
    const height = terrainHeight(x, z);
    const mottling = Math.sin(x * 0.071 + z * 0.029) * 0.5 + 0.5;
    positions.setZ(i, height);

    if (height > 1.2) {
      scratch.copy(mid).lerp(high, 0.35 + mottling * 0.25);
    } else {
      scratch.copy(low).lerp(mid, 0.45 + mottling * 0.25);
    }
    colors.push(scratch.r, scratch.g, scratch.b);
  }

  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function createGrassInstances(): GrassInstance[] {
  const rand = mulberry32(4218);
  const instances: GrassInstance[] = [];

  for (let i = 0; i < 760; i += 1) {
    const x = randBetween(rand, -470, 470);
    const z = randBetween(rand, -450, 470);
    if (!scenarioClearanceAllows(x, z) && rand() > 0.25) continue;

    instances.push({
      x,
      z,
      scale: randBetween(rand, 0.55, 1.65),
      rotation: randBetween(rand, 0, Math.PI * 2),
    });
  }

  return instances;
}

function createTreeInstances(): TreeInstance[] {
  const rand = mulberry32(89231);
  const instances: TreeInstance[] = [];

  while (instances.length < 120) {
    const x = randBetween(rand, -485, 485);
    const z = randBetween(rand, -470, 485);
    if (!scenarioClearanceAllows(x, z)) continue;

    const scale = randBetween(rand, 0.75, 1.35);
    instances.push({
      x,
      z,
      scale,
      rotation: randBetween(rand, 0, Math.PI * 2),
      trunkHeight: randBetween(rand, 5.5, 8.5) * scale,
      canopyRadius: randBetween(rand, 2.4, 3.9) * scale,
      canopyHeight: randBetween(rand, 5.8, 8.5) * scale,
    });
  }

  return instances;
}

function createRockInstances(): RockInstance[] {
  const rand = mulberry32(13277);
  const instances: RockInstance[] = [];

  for (let i = 0; i < 80; i += 1) {
    const x = randBetween(rand, -450, 450);
    const z = randBetween(rand, -430, 450);
    if (!scenarioClearanceAllows(x, z) && rand() > 0.18) continue;

    instances.push({
      x,
      z,
      scale: randBetween(rand, 0.55, 1.9),
      rotation: randBetween(rand, 0, Math.PI * 2),
      tiltX: randBetween(rand, -0.3, 0.3),
      tiltZ: randBetween(rand, -0.3, 0.3),
    });
  }

  return instances;
}

function useGrassMatrices(ref: React.RefObject<InstancedMesh | null>, instances: GrassInstance[]) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    const dummy = new Object3D();
    instances.forEach((instance, index) => {
      const y = terrainHeight(instance.x, instance.z) + 0.28 * instance.scale;
      dummy.position.set(instance.x, y, instance.z);
      dummy.rotation.set(0, instance.rotation, 0);
      dummy.scale.set(0.55 * instance.scale, 0.85 * instance.scale, 0.55 * instance.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [instances, ref]);
}

function useTreeMatrices(
  trunkRef: React.RefObject<InstancedMesh | null>,
  canopyRef: React.RefObject<InstancedMesh | null>,
  topCanopyRef: React.RefObject<InstancedMesh | null>,
  instances: TreeInstance[],
) {
  useLayoutEffect(() => {
    const trunkMesh = trunkRef.current;
    const canopyMesh = canopyRef.current;
    const topCanopyMesh = topCanopyRef.current;
    if (!trunkMesh || !canopyMesh || !topCanopyMesh) return;

    const dummy = new Object3D();
    instances.forEach((tree, index) => {
      const groundY = terrainHeight(tree.x, tree.z);

      dummy.position.set(tree.x, groundY + tree.trunkHeight / 2, tree.z);
      dummy.rotation.set(0, tree.rotation, 0);
      dummy.scale.set(0.38 * tree.scale, tree.trunkHeight, 0.38 * tree.scale);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(index, dummy.matrix);

      dummy.position.set(tree.x, groundY + tree.trunkHeight + tree.canopyHeight / 2, tree.z);
      dummy.rotation.set(0, tree.rotation, 0);
      dummy.scale.set(tree.canopyRadius, tree.canopyHeight, tree.canopyRadius);
      dummy.updateMatrix();
      canopyMesh.setMatrixAt(index, dummy.matrix);

      dummy.position.set(tree.x, groundY + tree.trunkHeight + tree.canopyHeight * 0.95, tree.z);
      dummy.rotation.set(0, tree.rotation + 0.55, 0);
      dummy.scale.set(tree.canopyRadius * 0.72, tree.canopyHeight * 0.7, tree.canopyRadius * 0.72);
      dummy.updateMatrix();
      topCanopyMesh.setMatrixAt(index, dummy.matrix);
    });

    trunkMesh.instanceMatrix.needsUpdate = true;
    canopyMesh.instanceMatrix.needsUpdate = true;
    topCanopyMesh.instanceMatrix.needsUpdate = true;
  }, [canopyRef, instances, topCanopyRef, trunkRef]);
}

function useRockMatrices(ref: React.RefObject<InstancedMesh | null>, instances: RockInstance[]) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    const dummy = new Object3D();
    instances.forEach((rock, index) => {
      const y = terrainHeight(rock.x, rock.z) + 0.22 * rock.scale;
      dummy.position.set(rock.x, y, rock.z);
      dummy.rotation.set(rock.tiltX, rock.rotation, rock.tiltZ);
      dummy.scale.set(1.25 * rock.scale, 0.42 * rock.scale, 0.8 * rock.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [instances, ref]);
}

function DirtClearings() {
  const targetY = terrainHeight(TARGET_WORLD.x, TARGET_WORLD.z);
  const friendliesY = terrainHeight(FRIENDLIES_WORLD.x, FRIENDLIES_WORLD.z);

  return (
    <group>
      <mesh
        position={[TARGET_WORLD.x, targetY + 0.08, TARGET_WORLD.z]}
        rotation={[-Math.PI / 2, 0, -0.28]}
        receiveShadow
      >
        <planeGeometry args={[76, 24]} />
        <meshStandardMaterial color="#756044" roughness={0.95} />
      </mesh>
      <mesh
        position={[TARGET_WORLD.x - 8, targetY + 0.1, TARGET_WORLD.z]}
        rotation={[-Math.PI / 2, 0, -0.28]}
        receiveShadow
      >
        <planeGeometry args={[68, 2.2]} />
        <meshStandardMaterial color="#3f3529" roughness={1} />
      </mesh>
      <mesh
        position={[TARGET_WORLD.x + 8, targetY + 0.1, TARGET_WORLD.z]}
        rotation={[-Math.PI / 2, 0, -0.28]}
        receiveShadow
      >
        <planeGeometry args={[68, 2.2]} />
        <meshStandardMaterial color="#3f3529" roughness={1} />
      </mesh>
      <mesh
        position={[FRIENDLIES_WORLD.x, friendliesY + 0.07, FRIENDLIES_WORLD.z]}
        rotation={[-Math.PI / 2, 0, 0.12]}
        receiveShadow
      >
        <planeGeometry args={[32, 18]} />
        <meshStandardMaterial color="#5a5038" roughness={0.95} />
      </mesh>
    </group>
  );
}

function GrassField() {
  const grassRef = useRef<InstancedMesh | null>(null);
  const grass = useMemo(() => createGrassInstances(), []);
  useGrassMatrices(grassRef, grass);

  return (
    <instancedMesh ref={grassRef} args={[undefined, undefined, grass.length]} castShadow receiveShadow>
      <coneGeometry args={[0.34, 1, 5]} />
      <meshStandardMaterial color="#6d8a42" roughness={1} />
    </instancedMesh>
  );
}

function TreeLine() {
  const trunkRef = useRef<InstancedMesh | null>(null);
  const canopyRef = useRef<InstancedMesh | null>(null);
  const topCanopyRef = useRef<InstancedMesh | null>(null);
  const trees = useMemo(() => createTreeInstances(), []);
  useTreeMatrices(trunkRef, canopyRef, topCanopyRef, trees);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, trees.length]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1.25, 1, 7]} />
        <meshStandardMaterial color="#4c3725" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, trees.length]} castShadow receiveShadow>
        <coneGeometry args={[1, 1, 8]} />
        <meshStandardMaterial color="#284528" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={topCanopyRef} args={[undefined, undefined, trees.length]} castShadow receiveShadow>
        <coneGeometry args={[1, 1, 8]} />
        <meshStandardMaterial color="#335a32" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

function RockScatter() {
  const rockRef = useRef<InstancedMesh | null>(null);
  const rocks = useMemo(() => createRockInstances(), []);
  useRockMatrices(rockRef, rocks);

  return (
    <instancedMesh ref={rockRef} args={[undefined, undefined, rocks.length]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#686454" roughness={1} />
    </instancedMesh>
  );
}

export default function Terrain() {
  const groundGeometry = useMemo(() => createGroundGeometry(), []);

  return (
    <group>
      <mesh receiveShadow>
        <primitive object={groundGeometry} attach="geometry" />
        <meshStandardMaterial vertexColors roughness={0.96} metalness={0} />
      </mesh>
      <DirtClearings />
      <GrassField />
      <TreeLine />
      <RockScatter />
    </group>
  );
}
