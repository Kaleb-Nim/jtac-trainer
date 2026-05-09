---
quick_id: 260509-fox
slug: demo-scenario
status: ready-for-planning
gathered: 2026-05-09
---

# Quick Task 260509-fox: Demo Scenario Design — Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Task Boundary

Design the single highly-demoable scenario for the hackathon: FPS view from a hill looking down at one BTR target. User uses a rangefinder to lase the target, capturing MGRS grid and slant range, which feed the 9-line brief that's read aloud to the JTAC pilot.

This is a **scenario design artifact** (storyboard + asset list + prop placement + script) that the Phase 2 (3D scene) and Phase 3 (pilot/grid bridge) executors will implement against. Not code.

</domain>

<decisions>
## Implementation Decisions

### Demo Flow — Wrong-grid miss as the punchline
- Demo runs **two consecutive takes** in the same scene:
  1. **Take A (correct):** Lase BTR → read 9-line with correct MGRS aloud → Hawg 21 reads back same grid → bomb hits BTR.
  2. **Take B (miss):** Reset; lase BTR → deliberately misread one digit of MGRS → Hawg 21's `<grid>` reflects misread → bomb visibly lands off-target near friendlies.
- This directly showcases the project's core value ("wrong voice transmission produces a visible, consequential miss").
- Reset between takes must be cheap (single button, <2s).

### MGRS Readout — Live grid + lase locks range
- 6-digit MGRS updates **continuously** in the reticle HUD as the crosshair sweeps terrain (matches existing SCENE-02 success criteria).
- Lase action is an **additional** capture: locks/displays slant range-to-target alongside the live grid; range readout persists in HUD until next lase or reset.
- Live grid stays running even after lase — the lase doesn't freeze the grid, only adds the range datum needed for 9-line line 5 (range/distance).

### Claude's Discretion

- **Rangefinder interaction model:** pick whatever is most demo-legible (recommend: hold `L` or right-click, brief audible "ping" + small "RNG: NNNN m" appears in HUD). Single keybind, no menu.
- **Terrain + BTR assets:** pick within Phase 2's 90-min budget. Recommend single hand-crafted heightmap hill (or simple displaced plane) + free BTR-80 GLB if quickly findable, else a low-poly box-on-treads primitive that reads as "armored vehicle" at distance. Friendlies billboard already in scope.
- **9-line content:** scenario card prefills lines 1–9 with the BTR scenario; only line 4 (MGRS) and line 6 (target description) need to feel live. Pilot reads back lines 4/6/8 per Phase 3 plan.
- **Hill vantage:** ~150–400m slant range to BTR — close enough to read silhouette, far enough that a 1-digit MGRS misread visibly misses.

</decisions>

<specifics>
## Specific Ideas

- Single scenario, single map, single target. No scenario picker.
- Wrong-grid miss should land near friendlies billboard so the debrief verdict ("unsafe") has visible justification.
- Reticle MGRS already in Phase 2 success criteria — extend, don't replace.

</specifics>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` — Phase 2 (SCENE-01..05), Phase 3 (PILOT-01..06), Phase 4 (BRIEF-01..06)
- `.planning/PROJECT.md` — Core value statement
- `.planning/STATE.md` — Current position (Phase 2 ready to plan)

</canonical_refs>
