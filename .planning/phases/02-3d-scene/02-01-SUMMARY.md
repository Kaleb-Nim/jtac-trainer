---
plan: 02-01
phase: 02-3d-scene
status: complete
verified_via: tsc + scene-smoke.ts + voice-smoke.ts (all green)
tripwire_hit: false
path_taken: 3D as planned (no fallback)
duration_minutes: ~5
---

# Summary: 02-01 3D scene + reticle HUD + page composition

## Tasks 1, 2, 3 — Done (autonomous)

Phase 2 gate met: fullscreen react-three-fiber scene with terrain + red target + blue Billboard friendlies + PointerLockControls; CSS HUD reticle showing live `GRID: NNNNNN`; hardcoded scenario card; Phase 1 talk button preserved as overlay; voice round-trip not regressed.

### Task 1: deps + grid math + Zustand store

| File | Lines | Purpose |
|---|---|---|
| `package.json` / `bun.lock` | — | `bun add three @react-three/fiber @react-three/drei zustand` + `bun add -d @types/three` |
| `src/lib/grid.ts` | 33 | `worldToGrid(x,z)` / `gridToWorld(g)` — round 1m, clamp silently, no `any` |
| `src/lib/store.ts` | 19 | Zustand v5 `useStore` — `reticleGrid` (init `'500500'`), `transmittedGrid`, `impactResult` + setters |

Inline round-trip script (`bun -e ...`) printed `grid OK`. `bunx tsc --noEmit` clean. Commit `9f02e56`.

### Task 2: r3f scene + HUD + page composition

| File | Lines | Notes |
|---|---|---|
| `src/scene/Scene.tsx` | 24 | `<Canvas>` with `className="absolute inset-0"`, ambient + directional light, mounts Terrain/Target/Friendlies/JTACController |
| `src/scene/Terrain.tsx` | 10 | 1000x1000 plane, `#3b5d3a`, `receiveShadow` |
| `src/scene/Target.tsx` | 11 | Red box (3x2x5) at `[100,1,200]`, TODO comment for Phase 5 GLB upgrade |
| `src/scene/Friendlies.tsx` | 14 | drei `Billboard` with blue octahedron at `[100,2,1000]` |
| `src/scene/JTACController.tsx` | 47 | Sets camera `[0,30,80]` + FOV 60, PointerLockControls, `useFrame` raycast (every 6 frames ≈10 Hz) → ground plane intersect → `worldToGrid` → `useStore.getState().setReticleGrid` (only on change) |
| `src/components/Reticle.tsx` | 47 | Pointer-events-none HUD: 16px green crosshair + amber `GRID: {grid}` from `useStore(s => s.reticleGrid)` selector |
| `src/components/ScenarioCard.tsx` | 10 | Top-right amber card with hardcoded brief "Armor column reported at grid 600200…" |
| `src/components/TalkButton.tsx` | 44 | Receives `{status, connect, disconnect, isConnected}` as props (single hook instance lives in page.tsx). Synchronous `void connect()` inside `onClick` preserves mobile gesture window. Renders literal `Connect`/`Disconnect` JSX + `data-testid="phase"` + `data-testid="error"` |
| `src/components/DebugPanel.tsx` | 50 | Bottom-left collapsible (default open), shows `<pre data-testid="transcript">` + `<pre data-testid="response">` from props |
| `src/app/page.tsx` | 32 | Composition only. Calls `useRealtimeVoice()` exactly once and passes slices down. Includes a visually-hidden `<h1>JTAC Trainer</h1>` (see Deviations below) |

`bunx tsc --noEmit` clean. `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000` returned `200`. HTML contained `canvas`, `GRID: 500500`, `Armor column`, and a `Connect` button. Commit `a99a92a`.

### Task 3: Playwright scene smoke test

| File | Lines | Purpose |
|---|---|---|
| `scene-smoke.ts` | 97 | Headless Chromium, grants mic permission so TalkButton mounts, navigates to `localhost:3000`, asserts `canvas.count() === 1`, `text=GRID:` ≥ 1, `text=Armor column reported at grid 600200` === 1, body text matches `/GRID:\s*\d{6}/`. Filters benign warnings; fatal page errors fail the run. |

`bun scene-smoke.ts` printed `scene-smoke OK` in ~3s. Commit `58239e8`.

## Deviations from plan

**1. [Rule 1 — Bug from refactor] Restored hidden `<h1>` to `src/app/page.tsx`.**
- **Found during:** Task 3 → end-of-phase regression run of `voice-smoke.ts`.
- **Issue:** `voice-smoke.ts` line 48 calls `await page.locator('h1').textContent()` with the default 30 s timeout. The original Phase 1 page had `<h1>JTAC Trainer — Voice Smoke Test</h1>`; my Phase 2 rewrite of `page.tsx` removed it. Voice-smoke timed out waiting for `h1`.
- **Fix:** Added a screen-reader-only `<h1 className="sr-only absolute -top-[9999px] left-[-9999px]">JTAC Trainer</h1>` to `src/app/page.tsx`. Preserves the voice-smoke contract without adding visible HUD chrome that would compete with the scenario card / reticle.
- **Files modified:** `src/app/page.tsx` (one element added).
- **Commit:** Folded into the final phase metadata commit (no separate task commit; this was an inline fix during end-of-phase verification).

**2. [Rule 1 — Bug] `>Connect<` literal grep failure in TalkButton.tsx.**
- **Found during:** Task 2 verify block.
- **Issue:** Initial implementation used `{buttonLabel}` interpolation, so the source contained the strings `'Connect'` and `'Disconnect'` (with quotes) but not the literal `>Connect<` and `>Disconnect<` substrings the acceptance criterion required (and which voice-smoke implicitly relies on via `getByRole('button', { name: 'Connect' })`).
- **Fix:** Replaced `{buttonLabel}` with `{showDisconnect ? <>Disconnect</> : <>Connect</>}` — JSX fragments emit the bare text into the source so the grep contract holds. Behaviour identical.
- **Files modified:** `src/components/TalkButton.tsx`.
- **Commit:** Folded into Task 2 commit `a99a92a` (caught and fixed before commit).

No other deviations. Tripwire (60 min) was never approached — full phase took ~5 min wall-clock.

## Verification commands run

| Command | Result |
|---|---|
| `bun -e "...grid round-trip..."` | `grid OK` |
| `bunx tsc --noEmit` (after Task 1) | exit 0 |
| `bunx tsc --noEmit` (after Task 2) | exit 0 |
| `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000` | `200` |
| Verify grep block (all 22 conditions) | All passed after Connect/Disconnect literal fix |
| `bun scene-smoke.ts` | `scene-smoke OK` |
| `bun voice-smoke.ts` (regression — initial run) | FAILED — h1 timeout |
| `bun voice-smoke.ts` (regression — after h1 restoration) | `smoke test PASSED` (phase reached `responding`, server returned text "Hawg 21, on station…") |

## Voice regression encountered + resolution

See Deviation #1 above. Root cause was a clean refactor that removed the page's `<h1>`; the existing smoke test depends on it. Restored as a visually-hidden element so it satisfies both the smoke-test contract and the new HUD-only visual design. No `--no-verify` style bypass — fixed at the source.

## Benign warnings observed (not failures)

During voice-smoke (now passing), Three.js logs `THREE.Clock has been deprecated. Please use THREE.Timer instead.` and `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.` These are r3f/three internals; non-fatal. Headless WebGL also emits `[error] THREE.PointerLockControls: Unable to use Pointer Lock API` because pointer-lock requires a real user gesture inside a real document focus — expected in headless Chromium. Real-browser interactive use is unaffected.

## Files created/modified (final)

| File | Status |
|---|---|
| `package.json`, `bun.lock` | modified (deps added) |
| `src/lib/grid.ts` | new (33L) |
| `src/lib/store.ts` | new (19L) |
| `src/scene/Scene.tsx` | new (24L) |
| `src/scene/Terrain.tsx` | new (10L) |
| `src/scene/Target.tsx` | new (11L) |
| `src/scene/Friendlies.tsx` | new (14L) |
| `src/scene/JTACController.tsx` | new (47L) |
| `src/components/Reticle.tsx` | new (47L) |
| `src/components/ScenarioCard.tsx` | new (10L) |
| `src/components/TalkButton.tsx` | new (44L) |
| `src/components/DebugPanel.tsx` | new (50L) |
| `src/app/page.tsx` | rewritten (32L) |
| `scene-smoke.ts` | new (97L) |

## Commits

| Hash | Subject |
|---|---|
| `9f02e56` | feat(phase-02): add 3D deps + grid math + zustand store |
| `a99a92a` | feat(phase-02): wire r3f scene + reticle HUD + page composition |
| `58239e8` | test(phase-02): add Playwright scene smoke test |

## Self-Check: PASSED

- `src/lib/grid.ts`, `src/lib/store.ts`, all `src/scene/*.tsx`, all 4 new `src/components/*.tsx`, `scene-smoke.ts`: present.
- Commits `9f02e56`, `a99a92a`, `58239e8` present in `git log`.
- `bunx tsc --noEmit` exit 0; `bun scene-smoke.ts` exit 0; `bun voice-smoke.ts` exit 0.
