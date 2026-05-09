'use client';

import { FRIENDLIES_WORLD, TARGET_WORLD } from '@/lib/positions';

export const TERRAIN_SIZE = 1000;

export function terrainHeight(x: number, z: number): number {
  return (
    Math.sin(x * 0.015) * 1.1
    + Math.cos(z * 0.012) * 0.8
    + Math.sin((x + z) * 0.007) * 0.65
    + Math.cos((x - z) * 0.009) * 0.45
  );
}

export function scenarioClearanceAllows(x: number, z: number): boolean {
  const distanceToTarget = Math.hypot(x - TARGET_WORLD.x, z - TARGET_WORLD.z);
  const distanceToFriendlies = Math.hypot(x - FRIENDLIES_WORLD.x, z - FRIENDLIES_WORLD.z);
  const blocksScenarioLane = x > 56 && x < 144 && z > 138 && z < 356;

  return distanceToTarget > 58 && distanceToFriendlies > 52 && !blocksScenarioLane;
}
