export type Verdict = 'solid' | 'needs_work' | 'unsafe' | 'no_strike';

// From .planning/phases/03-jtac-pilot-persona-grid-bridge/03-SCENARIO.md
// Locked values appendix:
//   Verdict threshold (target hit):       impact ≤ 30 m of BTR        → solid
//   Verdict threshold (friendlies safety): impact ≤ 75 m of friendlies → unsafe
// (unsafe takes precedence over solid — friendlies safety dominates)
export const SOLID_TARGET_M = 30;
export const UNSAFE_FRIENDLIES_M = 75;

export function computeVerdict(
  impact: { distanceToTarget: number; distanceToFriendlies: number } | null,
): Verdict {
  if (!impact) return 'no_strike';
  if (impact.distanceToFriendlies <= UNSAFE_FRIENDLIES_M) return 'unsafe';
  if (impact.distanceToTarget <= SOLID_TARGET_M) return 'solid';
  return 'needs_work';
}
