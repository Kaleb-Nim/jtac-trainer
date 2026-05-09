---
quick_id: 260509-fox
slug: demo-scenario
status: complete
completed: 2026-05-09
inserted_into_phase: 03-jtac-pilot-persona-grid-bridge
artifact: .planning/quick/260509-fox-demo-scenario/SCENARIO.md
artifact_copy: .planning/phases/03-jtac-pilot-persona-grid-bridge/03-SCENARIO.md
---

# Quick Task 260509-fox: Demo Scenario — Summary

Authored the locked Fox demo scenario as a single design document. Reconciled all coordinates against shipped Phase 2 source (`src/scene/*`, `src/lib/grid.ts`) per the phase-3 insertion note.

## Locked Constants

| Constant | Value |
|---|---|
| Canonical target MGRS | `599699` |
| Misread MGRS (Take B) | `599799` |
| Misread digit position | `4` (first northing digit) |
| Misread change | `6` → `7` |
| Camera position | `(0, 30, 80)` |
| Camera initial `lookAt` (recommended) | `(100, 1, 200)` |
| BTR position | `(100, 1, 200)` |
| Friendlies position (recommended) | `(100, 2, 320)` |
| Friendlies position (currently shipped) | `(100, 2, 1000)` — broken for demo |
| Slant range, camera → BTR | `159 m` |
| BTR → friendlies (recommended) | `120 m` (due south) |
| Take A expected impact | `(99.6, 0, 200.0)` — 0.4 m off BTR (`solid`) |
| Take B expected impact | `(99.6, 0, 300.3)` — 100 m off BTR, 20 m off friendlies (`unsafe`) |
| Verdict threshold (target) | impact within `30 m` of BTR → `solid` |
| Verdict threshold (friendlies) | impact within `75 m` of friendlies → `unsafe` |
| Lase keybind | `L` |
| Reset keybind | `R` |
| Lase ping | 1200 Hz square, 60 ms, WebAudio |

## Open Risks

1. **Friendlies relocation `(100, 2, 1000)` → `(100, 2, 320)` is required** for the Take B "unsafe" verdict to land. Without it, no single-digit misread can place the impact within 75 m of the friendlies (they're 800 m south of the BTR AND off the ground plane). Fallback documented in SCENARIO §6 but the relocation is the strongly recommended path.
2. **Digit-position fallback** — if the recommended friendlies position is rejected, no other single-digit misread on the canonical `599699` produces a near-miss on the original `(100, 2, 1000)` friendlies position. The demo punchline degrades to "miss" without the safety verdict. SCENARIO §6 spells this out.
3. **`session.reset` ws-server contract cost** — if reset takes >1s via WebSocket reconnect, Phase 3 should own the one-line ws-server edit so the in-session reset path keeps `AudioContext` unlocked.

## Pointers for Phase 3 Executor

- Hardcoded constants → SCENARIO.md "Locked values appendix". Recommend a `src/lib/demo.ts` constants module.
- BTR position is unchanged from shipped (`Target.tsx`).
- One-line nudges Phase 3 should absorb:
  - `Friendlies.tsx`: `position={[100, 2, 320]}`.
  - `JTACController.tsx`: `camera.lookAt(100, 1, 200)`.
- L-key rangefinder + RNG HUD slot → ~10 LOC; absorb into PILOT plan, not a new task.
- `<grid>` extraction is straightforward 6-digit numeric — both takes share the same shape.

## Artifact

Single source of truth: `.planning/quick/260509-fox-demo-scenario/SCENARIO.md` (also at `.planning/phases/03-jtac-pilot-persona-grid-bridge/03-SCENARIO.md`).
