---
phase: 03-jtac-pilot-persona-grid-bridge
plan: 03-SCENARIO
subsystem: design-doc
tags: [scenario, demo, scenario-design, design-artifact, no-code]
type: execute
autonomous: true
completed: 2026-05-09
duration_minutes: ~10
status: complete
requires: []
provides:
  - SCENARIO.md (single source of truth for the Fox demo)
  - locked MGRS constants (canonical 599699, misread 599799)
  - recommended Phase 3 nudges (friendlies relocation, camera lookAt)
affects:
  - Phase 3 (PILOT-02, PILOT-03, PILOT-05, PILOT-06) — consumes the verbatim script + locked grid digits
  - Phase 4 (BRIEF-01, BRIEF-04) — consumes expected impact distances + verdict thresholds
  - Phase 2 (SCENE-04) — surfaces an existing issue: friendlies billboard at (100,2,1000) is outside the 1000×1000 plane
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - .planning/quick/260509-fox-demo-scenario/SCENARIO.md
    - .planning/phases/03-jtac-pilot-persona-grid-bridge/03-SCENARIO.md (copy)
    - .planning/quick/260509-fox-demo-scenario/260509-fox-SUMMARY.md
    - .planning/phases/03-jtac-pilot-persona-grid-bridge/03-SCENARIO-SUMMARY.md
  modified: []
decisions:
  - "Canonical target MGRS is 599699 (computed from worldToGrid(100,200) against the actual src/lib/grid.ts implementation); abandons the plan body's 345678 picked pre-reconciliation"
  - "Take B misreads digit 4 (first northing digit) 6 → 7 → MGRS 599799 → impact (99.6, 0, 300.3) — 100 m off BTR, 20 m off the recommended friendlies position"
  - "Friendlies must be relocated from shipped (100,2,1000) to (100,2,320) for the 'unsafe' verdict to land — flagged as a one-line Phase 3 nudge in src/scene/Friendlies.tsx"
  - "Camera initial lookAt should change from (0,0,0) to (100,1,200) so the BTR is centered on first frame — one-line Phase 3 nudge in src/scene/JTACController.tsx"
  - "L-key rangefinder + RNG HUD slot is a small Phase 3 absorption (~10 LOC), not a new phase task"
metrics:
  files_created: 4
  files_modified: 0
  loc_added: ~580
  commits: 1
---

# Phase 03 Plan SCENARIO: Fox Demo Scenario Design Summary

Authored the locked, reconciled Fox demo scenario document — a single source of truth for the BTR-on-the-hill two-take 9-line storyboard with concrete coordinates, verbatim spoken script, exact MGRS digits, and Phase 3/4 cross-phase mapping. Reconciled all geometry against the actually-shipped Phase 2 source code rather than the plan body's pre-reconciliation Discretion picks.

## What Shipped

- **SCENARIO.md** at `.planning/quick/260509-fox-demo-scenario/SCENARIO.md` (canonical) and copied to `.planning/phases/03-jtac-pilot-persona-grid-bridge/03-SCENARIO.md` (per the insertion-note option 2). Eight required sections + Locked Values appendix.
- **Quick-task summary** at `.planning/quick/260509-fox-demo-scenario/260509-fox-SUMMARY.md` per the plan's `<output>` block.

## Reconciliation Details

The `<phase_3_insertion_note>` in `03-SCENARIO-PLAN.md` and the banner in `03-SCENARIO-CONTEXT.md` instructed: "Do NOT use the (-15,0,0) / (60,1.5,30) values literally — recompute camera vantage, slant range, canonical/misread MGRS pair against the actual `worldToGrid` implementation." Done:

| Element | Plan body (pre-reconciliation) | SCENARIO.md (reconciled to shipped) |
|---|---|---|
| BTR position | `(-15, 0, 0)` | `(100, 1, 200)` (from `src/scene/Target.tsx`) |
| Camera position | `(0, 35, 250)` | `(0, 30, 80)` (from `src/scene/JTACController.tsx`) |
| Friendlies position | `(60, 1.5, 30)` | `(100, 2, 1000)` shipped — **flagged broken**; recommend `(100, 2, 320)` |
| Slant range | `~253 m` | `~159 m` |
| Canonical MGRS | `345678` | `599699` (computed) |
| Misread MGRS | `345978` (digit 4: 6→9) | `599799` (digit 4: 6→7) |
| BTR → friendlies | `~80 m` (NE) | `120 m` (S, with recommended relocation) |

The locked decisions were honored verbatim: (a) two-take wrong-grid punchline as the demo arc, (b) live MGRS continues + lase locks range.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Verify gate hardcoded the wrong MGRS literals**
- **Found during:** Task 1 verification step
- **Issue:** The plan's `<verify>` automated gate greps for `345678` and `345978`. Those values are precisely the unreconciled Discretion picks the plan's own insertion note tells the executor to abandon. Verifying against them would either force the executor to use stale values OR fail the verify gate.
- **Fix:** Substituted the reconciled grids (`599699` / `599799`) in the verification check. Documented the canonical/misread pair in the SCENARIO.md frontmatter and Locked Values appendix so they're trivially greppable.
- **Files modified:** none (verification command-line only)

**2. [Rule 2 — Critical correctness] Friendlies billboard is unreachable for the demo punchline**
- **Found during:** Geometry reconciliation
- **Issue:** Friendlies at the shipped position `(100, 2, 1000)` are 800 m due south of the BTR AND 500 m outside the 1000×1000 ground plane (plane half-extent = 500). No single-digit MGRS misread can land an impact within 75 m of that position while staying on the plane. The "Take B → unsafe verdict" punchline — the explicit project value statement — cannot land with the shipped geometry.
- **Fix (proposed in SCENARIO.md, not applied here):** The doc spells out a one-line Phase 3 nudge: relocate friendlies to `(100, 2, 320)`. Includes a fallback section for "if Phase 3 declines to relocate" so the demo isn't silently broken.
- **Files modified:** none (this plan ships docs only; the actual `Friendlies.tsx` edit belongs to the Phase 3 plan)

**3. [Rule 2 — Critical correctness] Initial camera gaze does not contain the BTR**
- **Found during:** Geometry reconciliation
- **Issue:** Camera at `(0, 30, 80)` with `lookAt(0, 0, 0)` faces -Z. The BTR is at `(100, 1, 200)` — behind and to the right of the camera's initial gaze. On page load the user sees empty terrain; must mouse-rotate ~50° right + look down ~10° to acquire the target. Bad demo opening; bad first impression.
- **Fix (proposed in SCENARIO.md, not applied here):** One-line Phase 3 nudge: change `camera.lookAt(0, 0, 0)` to `camera.lookAt(100, 1, 200)` in `src/scene/JTACController.tsx`. Documented in §3 and §8.
- **Files modified:** none (deferred to Phase 3 wiring)

### Auth Gates

None — design-only plan, no external services touched.

### Architectural Decisions Deferred

None. All issues found were inline corrections to the design doc itself. The two recommended runtime nudges (friendlies relocation, camera lookAt) are explicitly flagged as one-line Phase 3 absorptions, not architectural changes.

## Open Risks for Phase 3

1. **Friendlies relocation must be applied** — without it, Take B cannot produce an `unsafe` verdict via single-digit misread. Fallback is documented in SCENARIO §6, but the recommendation is unambiguous.
2. **`session.reset` ws-server contract** — Phase 1 contract may not implement it yet. SCENARIO §7 specifies the fallback (drop & reopen WebSocket) but flags that the one-line ws-server edit is preferred so `AudioContext` stays unlocked.
3. **Friendlies billboard visibility from current vantage** — even after relocation to `(100, 2, 320)`, the camera at `(0, 30, 80)` looking at the BTR has the friendlies further south behind the BTR. Consider adding a small `↑ FRIENDLY POS` text label or panning the friendlies slightly east to disambiguate from the BTR silhouette. This is polish, not blocking.

## Pointers for Phase 3 Executor

- All hardcoded constants are in **SCENARIO.md → "Locked values appendix"**. Suggest creating `src/lib/demo.ts` to import from.
- The `<grid>` extraction contract (PILOT-02) only needs to handle 6-digit numeric strings — both takes use them.
- The `BombImpact` placement (PILOT-05) should call `gridToWorld(transmittedGrid)` directly — the demo coordinates have been verified to round-trip cleanly through `src/lib/grid.ts`.
- The L-key rangefinder is ~10 LOC; absorb into the PILOT plan rather than spinning a new task.

## Self-Check: PASSED

- File `.planning/quick/260509-fox-demo-scenario/SCENARIO.md`: FOUND
- File `.planning/phases/03-jtac-pilot-persona-grid-bridge/03-SCENARIO.md`: FOUND
- All 8 required section headings present (verified via grep gate)
- Canonical MGRS `599699` and misread `599799` both present
- Commit `d9c0587` on `main`: FOUND (`git log --oneline -5`)
