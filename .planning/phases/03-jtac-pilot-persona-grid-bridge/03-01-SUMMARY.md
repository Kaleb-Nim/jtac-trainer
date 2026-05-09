---
phase: 03-jtac-pilot-persona-grid-bridge
plan: 01
subsystem: jtac-pilot-persona-grid-bridge
tags: [pilot-persona, grid-extraction, bomb-impact, lase, reset, ws-server, r3f, zustand, smoke-test]
status: complete
verified_via:
  - bunx tsc --noEmit (frontend) — clean
  - cd ws-server && bunx tsc --noEmit — clean
  - bun voice-smoke.ts — PASSED
  - bun scene-smoke.ts — scene-smoke OK
  - bun bomb-smoke.ts — bomb-smoke OK (Test 1: distToTarget=0.50 m; Test 2: lasedRange=164.4 m + RNG visible; Test 3: distToFriendlies=20.20 m; Test 4: all three store fields cleared)
  - inline buffer regex assertion — BUFFER_OK (3 cases incl. heavily-split tag)
  - Task 6 human-verify checkpoint auto-approved (workflow.auto_advance=true)
duration_minutes: ~9
requires:
  - phase-01 (voice scaffold) — Bun ws-server, ASR/LLM/TTS pipeline, useRealtimeVoice hook, /tmp/jtac-ws.log handle
  - phase-02 (3d scene) — Three.js scene, Reticle, ScenarioCard slot, JTACController raycaster, worldToGrid/gridToWorld, Friendlies billboard
  - phase-03-SCENARIO — locked MGRS constants (599699 / 599799), reconciled prop positions, verbatim 9-line script
provides:
  - PILOT-01: Hawg 21 persona system prompt
  - PILOT-02: ws-server `<grid>NNNNNN</grid>` extraction (per-turn buffer, split-chunk safe)
  - PILOT-03: prompt-mandated readback of lines 4/6/8 + tag emission rule + 2 few-shot examples
  - PILOT-04: ServerMessage `grid.transmitted` variant + frontend hook case + Zustand setTransmittedGrid plumbing
  - PILOT-05: BombImpact r3f component (delay → fall → ring + smoke → impactResult write)
  - PILOT-06: typed ImpactResult with distanceToTarget + distanceToFriendlies for Phase 4 verdicts
  - SCENE-02 follow-up: lase (L-key) + RNG HUD line + amber flash + reticle pulse + WebAudio ping
  - SCENE-04 follow-up: FRIENDLIES_WORLD relocated to (100, 2, 320), camera initial lookAt nudged to (100,1,200)
  - SCENE-05 follow-up: verbatim 9-LINE BRIEF card (lines 1-9, literal [TGT_GRID] placeholders, SOUTH 120 METERS)
  - reset (R-key): clears transmittedGrid + lasedRange + impactResult; despawns bomb effects
  - bomb-smoke.ts regression covering all four flows
affects:
  - phase-04 (debrief) — consumes ImpactResult.distanceToTarget + distanceToFriendlies for verdict scoring
tech-stack:
  added: []
  patterns:
    - "Per-turn streaming buffer + tag-strip pattern in LLM onChunk callback (indexOf-based held-back tail handles split tags)"
    - "Dev-mode global hooks on window for Playwright regression (gated by NODE_ENV)"
    - "Zustand monotonic-timestamp field (lasePulseAt) keys CSS animation effects in subscriber components"
    - "useRef phase machine + lastHandled latch in r3f effect components for re-trigger semantics"
key-files:
  created:
    - src/lib/positions.ts
    - src/scene/BombImpact.tsx
    - bomb-smoke.ts
  modified:
    - prompts/system-prompt.md (replaced stub with full Hawg 21 persona + few-shots)
    - ws-server/src/types.ts (added grid.transmitted variant)
    - ws-server/src/session.ts (per-turn buffer + tag-strip in startResponse only)
    - src/hooks/useRealtimeVoice.ts (added grid.transmitted case)
    - src/lib/store.ts (typed ImpactResult, lasedRange, lasePulseAt fields)
    - src/scene/Target.tsx (import TARGET_WORLD)
    - src/scene/Friendlies.tsx (import FRIENDLIES_WORLD; z 1000 → 320)
    - src/scene/JTACController.tsx (camera lookAt nudge; L/R keydown handler)
    - src/scene/Scene.tsx (render <BombImpact />)
    - src/components/Reticle.tsx (RNG line, flash overlay, crosshair pulse)
    - src/components/ScenarioCard.tsx (verbatim 9-LINE BRIEF)
    - scene-smoke.ts (assertion updated to '9-LINE BRIEF')
decisions:
  - "Adopted SCENARIO override z=320 (not plan body z=300) for FRIENDLIES_WORLD — keeps the prop on the 1000×1000 ground plane and produces a geometrically clean 'Take B impact 20 m off friendlies' for the unsafe verdict."
  - "Set ScenarioCard line 8 to 'SOUTH 120 METERS' (not plan body's '100') to match the actual BTR(z=200) → friendlies(z=320) geometry."
  - "Buffer-drain held-back tail uses indexOf('<') (not lastIndexOf): the open '<grid>' must be preserved across chunks, not the more recent '</'."
  - "Camera initial lookAt nudged to (100,1,200) per SCENARIO §3 so the BTR is on-screen at first frame."
  - "Lase pulse driven by monotonic Zustand field (lasePulseAt) rather than custom event — simplest single-direction subscriber wiring."
  - "Reset is intentionally a Zustand-only operation; ws-server session state is preserved (camera, mic, audio context, conversation history) so the user can transition Take A → R → Take B in <1s with no reconnect."
  - "Auto-mode checkpoint protocol applied: Task 6 human-verify auto-approved because workflow.auto_advance=true. Persona reliability at emitting <grid> on every line-6 readback is not bulletproofed by automation; human will validate at demo time and may need to iterate the prompt."
metrics:
  files_created: 3
  files_modified: 11
  loc_added: ~600
  commits: 5
  duration_minutes: ~9
completed: 2026-05-09
---

# Phase 03 Plan 01: JTAC Pilot Persona + Grid Bridge Summary

Wired the demo punchline end-to-end: the LLM's hidden `<grid>NNNNNN</grid>` tag flows from prompt → ws-server extraction → `grid.transmitted` server message → frontend hook → Zustand store → BombImpact animation, with a typed `ImpactResult` (distance-to-target + distance-to-friendlies) written for Phase 4 debrief consumption. Take A grid `599699` lands the bomb 0.5 m off the BTR; Take B misread `599799` lands 20 m off the relocated friendlies position — visible miss, inside the 75 m unsafe-verdict threshold. Lase (L) and reset (R) keybinds + verbatim 9-line card + RNG HUD line absorbed per SCENARIO insertion. All three regression smoke tests (voice, scene, bomb) green.

## Tasks

### Task 1 — Hawg 21 persona + positions module + store typing + 9-line card
**Commit:** `c3d09fb`
**Files:** `prompts/system-prompt.md`, `src/lib/positions.ts` (new), `src/scene/Target.tsx`, `src/scene/Friendlies.tsx`, `src/lib/store.ts`, `src/components/ScenarioCard.tsx`, `scene-smoke.ts`
**Done:** Replaced Phase 1 stub prompt with full Hawg 21 A-10 persona (clipped CAS register, mandatory readback of lines 4/6/8, `<grid>` emission rule, two few-shots for 599699/599799 demonstrating the "no auto-correct" contract). Created `positions.ts` as the single source of truth; refactored Target + Friendlies to import. Strengthened store with typed `ImpactResult` and added `lasedRange` + `lasePulseAt` fields. Replaced ScenarioCard with the verbatim 9-LINE BRIEF (literal `[TGT_GRID]` placeholders on lines 4 + 6, SOUTH 120 METERS on 8, NORTH on 9). Updated scene-smoke assertion from old `Armor column` text to `9-LINE BRIEF`.

### Task 2 — ws-server `<grid>` tag extraction (single allowed edit)
**Commit:** `5b95daf`
**Files:** `ws-server/src/types.ts`, `ws-server/src/session.ts`
**Done:** Added `ServerMessage` variant `{type:'grid.transmitted', grid: string}`. Inside `startResponse` and only there, added per-turn `pendingText` buffer + `GRID_RE` regex + a local `flushClean` helper that fans tag-stripped text out to TTS, response.text.delta, and assistantResponse together. `onChunk` drains all complete tags then holds back from the first unmatched `<`. `onComplete` does a final tag scan + flush before the existing `finishTtsSession` + history-push. ASR setup, TTS lifecycle, barge-in, abort, latency tracking, and history cap all untouched. ws-server restarted on `:8080` (PID 35626).

### Task 3 — Frontend hook `grid.transmitted` + BombImpact + Scene wiring
**Commit:** `be624dc`
**Files:** `src/hooks/useRealtimeVoice.ts`, `src/scene/BombImpact.tsx` (new, 215 lines), `src/scene/Scene.tsx`
**Done:** Added `grid.transmitted` case to `handleMessage` switch (validates 6 digits, calls `useStore.getState().setTransmittedGrid`). Created BombImpact: r3f component with phase machine (`idle → delay(1.0s) → falling(0.8s eased) → impact(ring + smoke 1.2-2.0s) → cooldown → idle`); writes `ImpactResult` with `distanceToTarget` (vs `TARGET_WORLD`) and `distanceToFriendlies` (vs `FRIENDLIES_WORLD`) at impact; on `transmittedGrid → null` (R-reset) immediately hides effects, clears `lastHandledRef`. Dev-mode `window.__setTransmittedGrid`, `__getImpactResult`, `__getStore` hooks gated on `NODE_ENV !== 'production'`. Scene.tsx renders `<BombImpact />` between Friendlies and JTACController.

### Task 4 — L-key lase + R-key reset + Reticle RNG + flash + pulse
**Commit:** `437296d`
**Files:** `src/scene/JTACController.tsx`, `src/components/Reticle.tsx`
**Done:** Camera initial `lookAt` nudged from `(0,0,0)` → `(100,1,200)` per SCENARIO §3. New `keydown` `useEffect`: L performs a fresh raycast (reusing existing refs — no per-key allocs), computes camera→hit slant range, writes `setLasedRange + setLasePulseAt`, plays a 1200 Hz square-wave 60 ms WebAudio ping (lazy AudioContext, silent fallback). R clears `transmittedGrid + lasedRange + impactResult`. Reticle now subscribes to `lasedRange + lasePulseAt`: renders an additional `RNG  NNNN m` line under GRID (zero-padded to 4 digits) when lased; full-screen amber overlay (#ffb000 @ 6% opacity) flashes for 80 ms; crosshair scales to 1.4× then settles to 1.0× over 200 ms via CSS transform.

### Task 5 — bomb-smoke regression
**Commit:** `be2d6ad`
**Files:** `bomb-smoke.ts` (new, 132 lines)
**Done:** Playwright headless regression driving BombImpact via dev hooks (no LLM dependency). Four tests, all passing: (1) inject `599699` → impact `0.50 m` off TARGET_WORLD; (2) press L → `lasedRange=164.4 m` + `RNG NNNN m` line visible; (3) inject `599799` → impact `20.20 m` off FRIENDLIES_WORLD (well inside unsafe threshold); (4) press R → all three store fields null. Mirrors scene-smoke launch + permission + console-filter pattern (filters `ResizeObserver`, `PointerLockControls`, `WrongDocumentError`, deprecation/GL warnings).

### Task 6 — Human verify (checkpoint)
**Status:** Auto-approved per `workflow.auto_advance=true`.
**Done:** Automated regression covers the geometry + store + effects half of the demo end-to-end. Persona reliability at emitting `<grid>` on every line-6 readback is not bulletproof under automation (depends on Qwen LLM compliance with the prompt's tag rule); flagged for human validation at demo time. Prompt currently ships with two explicit few-shots and a "fire-control system requires the tag" framing — first-shot reliability is expected but may need iteration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] ws-server buffer drain leaked open `<grid>` prefix on split chunks**
- **Found during:** Task 2 inline BUFFER_OK assertion
- **Issue:** Initial implementation used `pendingText.lastIndexOf('<')` to mark the held-back tail. With chunks like `["<grid>59969", "9</gri", "d>"]`, after appending the second chunk the buffer is `<grid>599699</gri`, no complete match yet — `lastIndexOf('<')` points at `</`, so the algorithm flushed `<grid>599699` to TTS, leaking the open tag.
- **Fix:** Switched to `indexOf('<')` so the earliest unmatched open tag is held back until its close arrives.
- **Files modified:** `ws-server/src/session.ts`
- **Verified by:** 3-case BUFFER_OK assertion (single tag, heavily-split tag, two consecutive tags).
- **Commit:** `5b95daf` (fix folded into the same task commit)

**2. [Rule 3 — Blocking / SCENARIO override] Plan body z=300 vs SCENARIO z=320 for FRIENDLIES_WORLD**
- **Found during:** Task 1 prep
- **Issue:** Plan body specifies `FRIENDLIES_WORLD = { x: 100, y: 2, z: 300 }` and acceptance gate `grep -q 'z: 300'`. SCENARIO doc + operator override pin z=320 ("Friendlies: relocate to (100, 2, 320) per SCENARIO nudge"). Operator directive supersedes plan body per the execute-phase prompt.
- **Fix:** Used z=320. Adjusted my own task-1 verify gate to `grep -q 'z: 320'` (still asserts the SCENARIO-locked value).
- **Downstream impact:** plan body bomb-smoke threshold `distanceToFriendlies < 5` was geometrically impossible at z=320 (impact lands 19.7 m off, not on top of friendlies). Widened to `< 25` in `bomb-smoke.ts` Test 3 — well inside the 75 m unsafe-verdict threshold. Documented inline.
- **Files modified:** `src/lib/positions.ts`, `bomb-smoke.ts`
- **Commits:** `c3d09fb`, `be2d6ad`

**3. [Rule 3 — SCENARIO override] ScenarioCard line 8 distance string**
- **Found during:** Task 1 ScenarioCard authoring
- **Issue:** Plan body says line 8 = `SOUTH 100 METERS, MARKED BLUE PANEL` and acceptance gate `grep -q 'SOUTH 100 METERS'`. SCENARIO §5 says `SOUTH 120 METERS` to match the actual BTR(z=200) → friendlies(z=320) = 120 m geometry.
- **Fix:** Used `SOUTH 120 METERS`. Adjusted my own task-1 verify gate accordingly.
- **Files modified:** `src/components/ScenarioCard.tsx`
- **Commit:** `c3d09fb`

### Auth Gates
None.

### Architectural Decisions Deferred
None.

## Pre-existing condition (not introduced by this plan)

- The plan's Task 3 acceptance gate `grep -c 'useRealtimeVoice()' src/app/page.tsx == 1` matches both the call site (line 14) AND a docstring comment (line 11) referencing `useRealtimeVoice()`. Count is 2, has been 2 since Phase 1. The semantic invariant ("single call site preserved") is satisfied — only line 14 invokes the hook. The gate as literally written would have failed against any prior commit. Documented; no fix required.

## Verification Commands Run

| Command | Result |
|---|---|
| `bunx tsc --noEmit` (frontend) | clean (exit 0) |
| `cd ws-server && bunx tsc --noEmit` | clean (exit 0) |
| inline `bun -e` BUFFER_OK assertion | `BUFFER_OK` |
| `bun voice-smoke.ts` | `▸ smoke test PASSED` |
| `bun scene-smoke.ts` | `scene-smoke OK` |
| `bun bomb-smoke.ts` | `bomb-smoke OK` (4/4 tests) |
| `bun -e 'gridToWorld("599699")'` | `(99.6, 0, 199.7)` — sanity ✓ |
| `bun -e 'gridToWorld("599799")'` | `(99.6, 0, 299.8)` — sanity ✓ |
| `lsof -ti:8080` | `35626` (ws-server up) |

## Files Created / Modified

### Created (3)
| Path | Purpose |
|---|---|
| `src/lib/positions.ts` | TARGET_WORLD + FRIENDLIES_WORLD constants, single source of truth |
| `src/scene/BombImpact.tsx` | r3f bomb-impact animation + dev hooks |
| `bomb-smoke.ts` | Playwright regression for grid→impact + lase + reset |

### Modified (11)
| Path | Change |
|---|---|
| `prompts/system-prompt.md` | Replaced stub with full Hawg 21 persona |
| `ws-server/src/types.ts` | Added `grid.transmitted` ServerMessage variant |
| `ws-server/src/session.ts` | Per-turn buffer + tag-strip in `startResponse` only |
| `src/hooks/useRealtimeVoice.ts` | Added `grid.transmitted` case |
| `src/lib/store.ts` | Typed `ImpactResult`, added `lasedRange` + `lasePulseAt` |
| `src/scene/Target.tsx` | Import TARGET_WORLD |
| `src/scene/Friendlies.tsx` | Import FRIENDLIES_WORLD; z=1000 → 320 |
| `src/scene/Scene.tsx` | Render `<BombImpact />` |
| `src/scene/JTACController.tsx` | Camera lookAt nudge; L/R keydown |
| `src/components/Reticle.tsx` | RNG line + flash + pulse |
| `src/components/ScenarioCard.tsx` | Verbatim 9-LINE BRIEF |
| `scene-smoke.ts` | Assertion updated to `9-LINE BRIEF` |

## Commits (5)

| Hash | Subject |
|---|---|
| `c3d09fb` | feat(03-01): Hawg 21 persona + positions module + typed store + 9-line card |
| `5b95daf` | feat(03-01): ws-server `<grid>` tag extraction with split-chunk handling |
| `be624dc` | feat(03-01): grid.transmitted hook case + BombImpact component + Scene wiring |
| `437296d` | feat(03-01): L-key lase + R-key reset + RNG HUD line + flash + pulse |
| `be2d6ad` | test(03-01): bomb-smoke regression — Take A + lase + Take B + reset |

## Note: SCENE-02 / SCENE-05 absorption

Per the SCENARIO insertion (260509-fox), Phase 3 absorbed three follow-up nudges that nominally belonged to Phase 2:
- **SCENE-02 follow-up:** added the `RNG  NNNN m` HUD line + lase visual feedback under `Reticle.tsx` (Phase 2 shipped GRID line only).
- **SCENE-04 follow-up:** relocated FRIENDLIES_WORLD from (100,2,1000) → (100,2,320); nudged camera lookAt from (0,0,0) → (100,1,200).
- **SCENE-05 follow-up:** replaced the placeholder ScenarioCard sentence with the verbatim 9-LINE BRIEF.

Phase 2 is closed; these nudges are documented as in-Phase-3 absorption rather than reopened Phase 2 tasks.

## Self-Check: PASSED

- File `src/lib/positions.ts`: FOUND
- File `src/scene/BombImpact.tsx`: FOUND
- File `bomb-smoke.ts`: FOUND
- Commit `c3d09fb` (Task 1): FOUND in `git log`
- Commit `5b95daf` (Task 2): FOUND in `git log`
- Commit `be624dc` (Task 3): FOUND in `git log`
- Commit `437296d` (Task 4): FOUND in `git log`
- Commit `be2d6ad` (Task 5): FOUND in `git log`
- ws-server process on :8080: FOUND (PID 35626 via lsof)
- Frontend tsc clean: VERIFIED
- ws-server tsc clean: VERIFIED
- All three smoke tests green: VERIFIED
