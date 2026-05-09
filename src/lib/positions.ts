// Single source of truth for demo prop world positions.
//
// Phase 3 SCENARIO reconciliation (260509-fox):
// - FRIENDLIES_WORLD.z moved from shipped Phase 2 value 1000 (off the ground plane)
//   to 320 per the locked SCENARIO doc.
// - With friendlies at z=320, a Take-B misread of MGRS 599699 → 599799
//   (digit-position-4, 6→7) produces an impact at world ≈(99.6, 0, 300.3),
//   which is ~19.7 m from the friendlies and ~100.3 m from the BTR target —
//   inside the 75 m friendlies-safety threshold (Phase 4 unsafe verdict).
// - SCENARIO doc § "Locked values appendix" is the canonical source for these
//   numbers; do not change without re-reading and re-deriving the impact math.
export const TARGET_WORLD = { x: 100, y: 1, z: 200 } as const;
export const FRIENDLIES_WORLD = { x: 100, y: 2, z: 320 } as const;
