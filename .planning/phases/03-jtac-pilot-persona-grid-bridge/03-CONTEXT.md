# Phase 3: JTAC pilot persona + grid bridge — Context

**Gathered:** 2026-05-09
**Status:** Ready for planning
**Source:** Distilled from `.planning/intel/original-plan.md` Phase 3 + on-disk audit of ws-server/session.ts and Phase 2 store

**Supplementary docs (inserted 2026-05-09 from quick task `260509-fox`):**
- `03-SCENARIO-CONTEXT.md` — locked decisions on demo flow (two-take wrong-grid punchline) and HUD behavior (live MGRS + lase locks range)
- `03-SCENARIO-PLAN.md` — plan to author a SCENARIO.md design artifact; coordinates need reconciling to shipped `TARGET_WORLD` / `FRIENDLIES_WORLD` before execution (see insertion banners in those files)

<domain>
## Phase Boundary

Reach the punchline gate: **user reads a 9-line aloud, pilot reads back lines 4/6/8 in clipped comms, the bomb falls at the grid the pilot's transcript actually contained — wrong grid produces a visible miss.**

Time budget: 60 min. This is the highest-leverage demo phase; do NOT add anything not on the critical path.

</domain>

<decisions>
## Implementation Decisions

### System prompt: "Hawg 21" — full persona
- Replace `prompts/system-prompt.md` (currently a Phase 1 stub) with the full A-10 pilot persona.
- Behavior rules:
  - Clipped comms register: short sentences, "copy", "tally", "say again", "in hot", "rifle/bombs away". Never break character.
  - Read back AT MINIMUM lines 4 (heading), 6 (target location), 8 (friendlies) of the 9-line.
  - **When reading back line 6, MUST emit hidden tag `<grid>NNNNNN</grid>` — exactly six digits, no spaces — matching the grid the JTAC transmitted.**
  - Ask for clarification ONCE if any line is ambiguous (e.g., garbled grid).
  - Call "in hot" before strike; "rifle" or "bombs away" at release.
  - Never read the literal `<grid>` tag aloud — it's emitted in the text stream but stripped before TTS (server-side).
- Few-shot: include 1-2 example transmissions in the prompt so the model reliably emits the tag.
- Tone: terse, professional, slightly tense — A-10 pilots in CAS comms.

### ws-server edit (THE ONE allowed edit)
- File: `ws-server/src/session.ts` — modify ONLY the LLM `onChunk` callback (currently lines ~141-150).
- File: `ws-server/src/types.ts` — add new `ServerMessage` variant: `| { type: 'grid.transmitted'; grid: string }`.
- Add a per-turn buffer state in the Session class (or local to startResponse): `let pendingText = ''`. Reset at start of each LLM stream.
- New chunk handling:
  ```
  pendingText += chunk
  // Scan for complete <grid>(\d{6})</grid> matches; for each:
  //   1. emit session.send({ type: 'grid.transmitted', grid })
  //   2. replace the matched substring with '' in pendingText
  // Find safeFlushIdx = pendingText.lastIndexOf('<')
  //   - if -1: flush all of pendingText (no possible partial tag)
  //   - else: flush pendingText.slice(0, safeFlushIdx); keep the rest pending
  // For the flush portion: appendTextToTts(handle, flush); session.send({ type: 'response.text.delta', delta: flush })
  ```
- On stream end (existing `onComplete` callback): flush whatever remains in `pendingText` (one final scan + send).
- Result: client receives `grid.transmitted` events as soon as a complete tag arrives, and the response.text.delta stream + TTS audio never contain the literal `<grid>` tag.
- Per-turn isolation: the buffer is created per `startResponse` call (no cross-turn pollution).

### Frontend: hook changes (`src/hooks/useRealtimeVoice.ts`)
- Add `case 'grid.transmitted':` to `handleMessage` switch.
- On receipt: call `useStore.getState().setTransmittedGrid(grid)` (the store already has this field from Phase 2).
- Do NOT change anything else in the hook.

### Frontend: BombImpact scene component (`src/scene/BombImpact.tsx`)
- New `'use client'` r3f component, rendered inside `<Scene>`.
- Subscribes to `transmittedGrid` from the Zustand store.
- On `transmittedGrid` change (non-null), trigger an animation:
  - Compute `target = gridToWorld(transmittedGrid)`
  - **Drop-delay: 1.0s** after the grid.transmitted event (gives pilot time to say "in hot, rifle" via TTS so the visual lands at the right narrative beat).
  - Animate a small dark sphere from world `[target.x, 200, target.z]` falling to `[target.x, 0, target.z]` over ~0.8s (linear or accelerating; t² is fine).
  - On impact: spawn an expanding orange ring (torus geometry, growing from radius 1m → 25m over 1.2s, fading opacity 1 → 0) + a smoke puff (group of 4-5 dark gray spheres expanding + rising for 2s).
  - After 3s total, the impact effect despawns; the next `transmittedGrid` change can re-trigger.
- After the impact lands, **also write impactResult to the store** for Phase 4 to consume:
  - `impactResult = { grid, world: target, distanceToTarget, distanceToFriendlies, timestamp }`
  - Hardcode target world position from `Target.tsx` (currently `[100, 1, 200]`) and friendlies position from `Friendlies.tsx` (currently `[100, 2, 1000]`) as constants in `src/lib/positions.ts` for shared use.
- Use a small ref counter (`useRef<number>`) to ignore duplicate triggers if the same grid is set twice in quick succession.
- Implementation hint: useFrame with a startTime ref + animation phase enum ('idle' | 'falling' | 'impact' | 'cooldown').

### Store extension
- Update `src/lib/store.ts` to include the impactResult typing fully (currently `null` per Phase 2). Type:
  ```
  type ImpactResult = {
    grid: string;
    world: { x: number; y: number; z: number };
    distanceToTarget: number;
    distanceToFriendlies: number;
    timestamp: number;
  } | null;
  ```
- Existing setter `setImpactResult` already exists from Phase 2; just make it strongly typed.

### Positions module (new) — RECONCILED with SCENARIO insertion (2026-05-09)
- `src/lib/positions.ts` — single source of truth for target + friendlies world coords.
  ```
  export const TARGET_WORLD = { x: 100, y: 1, z: 200 } as const;
  export const FRIENDLIES_WORLD = { x: 100, y: 2, z: 300 } as const;  // moved from z=1000 → z=300 to support two-take demo punch
  ```
- Update `Target.tsx` and `Friendlies.tsx` to import these. **`Friendlies.tsx` currently inlines `[100, 2, 1000]` from Phase 2 — this MUST change to use FRIENDLIES_WORLD (now z=300).**
- Rationale: per `03-SCENARIO-CONTEXT.md` insertion banner, the locked decisions are (a) two-take wrong-grid arc and (b) lase locks range; geometry is reconcilable. Original Phase 1/2 placed friendlies 800m south, but a 1-digit MGRS misread shifts impact by ~30-100m; with friendlies at z=300 (100m south of target), digit-3 misread `6→7` lands the bomb exactly on friendlies → "unsafe" verdict reads naturally.

### Frontend: Reticle wired to scenario card grid
- Update `ScenarioCard.tsx` so its hardcoded text uses the actual target's `worldToGrid(TARGET_WORLD.x, TARGET_WORLD.z)` value, NOT the literal "600200" baked in from Phase 2 plan. Use `worldToGrid(100, 200)` → **`599699`** (verified by inline calc) → display in the brief.
- One-line fix: import positions + grid helpers, format the brief at render time.

### Two-take demo arc (locked from SCENARIO insertion)
- **Take A — Correct:** user reads MGRS aloud as `five-nine-nine, six-nine-nine` → pilot reads back → emits `<grid>599699</grid>` → bomb falls at `gridToWorld("599699") ≈ (100, 0, 200)` = on target.
- **Take B — Misread:** after R-key reset, user deliberately misreads digit-3 (`6 → 7`): says `five-nine-nine, seven-nine-nine` → pilot echoes the misread → emits `<grid>599799</grid>` → bomb falls at `(100, 0, 300)` = exactly on friendlies billboard (100m south of target).
- The pre-baked digit-3 misread is the chosen demo punch because it produces an unambiguous "near friendlies" miss with shipped TARGET position.

### Lase / rangefinder (NEW — from SCENARIO)
- New keybind `L` (or right-mouse) — single tap. While not lasing, reticle shows live MGRS only. On lase: capture slant-range from camera to ground-raycast hit point and display below the live grid in the HUD.
- Visual feedback on lase: 80ms full-screen amber flash at 6% opacity + reticle pulse 1.4× scale 200ms + audible 1200Hz "ping" 60ms via WebAudio (mute if audioCtx not unlocked).
- HUD layout (Reticle):
  ```
  GRID  599699           ← live, ~10Hz, always visible
  RNG   0253 m           ← appears after first lase, persists until next lase or R
  ```
- Range = straight-line distance from camera position to raycast hit (not horizontal). One-shot.
- Implementation: extend `useFrame` in `JTACController.tsx` to also write `lasedRange: number | null` to the store on `L` keydown event.

### Reset (NEW — from SCENARIO)
- New keybind `R` — single tap.
- Clears: bomb impact effects (sphere/ring/smoke despawn), `transmittedGrid`, `lasedRange`, `impactResult` in store. Transcript stays (DebugPanel keeps history per session).
- Does NOT close the WebSocket session — keep ws-server connection alive (no need for `session.reset` event in Phase 3; Phase 4 may add).
- Camera pose persists; mic context stays unlocked.
- Time budget: <2s from R-press to ready-for-Take-B.

### 9-line brief card (extends ScenarioCard from Phase 2)
- Replace the simple Phase 2 scenario brief with the full 9-line card from SCENARIO §5 — top-right, ~280px wide, mil-spec mono on translucent dark.
- Lines 1–9 verbatim. Lines 4 and 6 print the literal text `[TGT_GRID]` (the user reads the live HUD grid aloud — we do NOT auto-substitute, that breaks the demo cadence).
- Card text:
  ```
  9-LINE BRIEF
  1. IP:               COWBOY
  2. Heading:          180°
  3. Distance from IP: 4.2 km
  4. Target elevation: [TGT_GRID]
  5. Target description: BTR-80 armored personnel carrier
  6. Target location:  [TGT_GRID]   ← speak the live HUD grid here
  7. Mark type:        LASER
  8. Friendlies:       SOUTH 100 METERS, MARKED BLUE PANEL
  9. Egress:           NORTH
  ```
- Note line 8 changed from "NORTHEAST 80 m" (SCENARIO doc) to "SOUTH 100 METERS" to match the reconciled friendlies position (100m south of target). Line 9 changed to "NORTH" (egress away from friendlies).

### Out of scope this phase
- Debrief loop and `/api/debrief` route (Phase 4)
- "End run" button (Phase 4)
- Mil-spec aesthetic / radio SFX / bandpass filter (Phase 5)
- Vercel deploy (Phase 5)
- Smoke recording (Phase 6)

### Claude's Discretion
- Exact bomb falling animation timing/easing (within: 1s drop delay, ~0.8s fall, ~3s total despawn)
- Smoke puff visual style (low-poly spheres OK; particle systems are overkill)
- Whether to use drei's `<Float>` or `<Trail>` helpers vs raw mesh transforms (raw is fine for the sprint)
- Few-shot example wording in the system prompt (must yield reliable `<grid>` emission; tune empirically if first-pass misses)
</decisions>

<canonical_refs>
## Canonical References

### Project files to read
- `./prompts/system-prompt.md` — current Phase 1 stub; will be REPLACED entirely
- `./ws-server/src/session.ts` — lines ~120-180 contain the LLM stream loop; ONLY edit the onChunk callback + add per-turn buffer state. Do NOT touch ASR, TTS init, conversation history, or barge-in logic.
- `./ws-server/src/types.ts` — add `grid.transmitted` variant to `ServerMessage`
- `./src/hooks/useRealtimeVoice.ts` — add `grid.transmitted` case to `handleMessage` switch (around line 184)
- `./src/lib/store.ts` — extend `ImpactResult` type
- `./src/lib/grid.ts` — already provides `gridToWorld` (Phase 2)
- `./src/scene/Target.tsx`, `./src/scene/Friendlies.tsx` — refactor to use shared positions module
- `./src/scene/Scene.tsx` — add `<BombImpact />` to the scene composition
- `./src/components/ScenarioCard.tsx` — fix grid string mismatch (Phase 2 INFO #5)
- `./.planning/phases/02-3d-scene/02-01-SUMMARY.md` — Phase 2 outcome / what's currently wired

### Reference implementations
- `/Users/kalebnim/Documents/GitHub/nim-kaleb/prompts/system-prompt.md` — pattern for system prompt (NOT content; that's domain-specific to JTAC)

### External docs (use Context7 if needed)
- THREE.js TorusGeometry, MeshStandardMaterial transparent + opacity for the impact ring
- react-three-fiber `useFrame` for the falling sphere animation
- Regex behavior in JavaScript for `/<grid>(\d{6})<\/grid>/g` with global flag (single-pass exec)
</canonical_refs>

<specifics>
## Specific Ideas

- New file map:
  - `src/scene/BombImpact.tsx` — falling sphere → ring + smoke
  - `src/lib/positions.ts` — TARGET_WORLD + FRIENDLIES_WORLD constants
  - `prompts/system-prompt.md` — full Hawg 21 persona (REPLACE)
- Modified files:
  - `ws-server/src/types.ts` — add 1 line to ServerMessage union
  - `ws-server/src/session.ts` — refactor 1 callback (~10-15 added lines for buffer + tag extraction)
  - `src/hooks/useRealtimeVoice.ts` — add 1 case (~3-4 lines)
  - `src/lib/store.ts` — strengthen ImpactResult type
  - `src/scene/Target.tsx` — use TARGET_WORLD constant
  - `src/scene/Friendlies.tsx` — use FRIENDLIES_WORLD constant
  - `src/scene/Scene.tsx` — render `<BombImpact />`
  - `src/components/ScenarioCard.tsx` — compute scenario grid from TARGET_WORLD via worldToGrid
- Smoke test pattern (`bomb-smoke.ts`, mirrors `voice-smoke.ts` / `scene-smoke.ts`):
  - Launch headless Chromium with fake mic
  - Connect, wait for session.ready
  - **Inject** a fake `grid.transmitted` event by patching `useRealtimeVoice` test hook OR by directly calling `useStore.getState().setTransmittedGrid('500500')` via `page.evaluate(() => { (window as any).__TEST_TRIGGER__('500500'); })`. Easiest: add a tiny dev-only `window.__setTransmittedGrid` exposure in BombImpact's mount effect (gated by `if (process.env.NODE_ENV !== 'production')`).
  - Wait ~3s, assert that the page still has the canvas (impact didn't crash) and that store was set.
  - This avoids needing to actually drive the LLM to emit `<grid>` (which is timing-sensitive).
- ws-server tag-stripping unit test (inline node script, no test framework needed):
  - `bun -e "..."` with a small reproduction of the buffer logic operating on a fixed input. Asserts grid extracted + tag stripped correctly across split chunks.
- Gating reminder: ScriptProcessorNode deprecation warning is pre-existing; do not address this phase.
- Restart rule: after editing `ws-server/src/session.ts` or `types.ts`, the running ws-server (PID 33048) MUST be killed and restarted (`pkill -f "ws-server/src/index.ts"; cd ws-server && bun src/index.ts > /tmp/jtac-ws.log 2>&1 &`) — Bun does NOT hot-reload the long-running server process. Frontend hot-reloads automatically.
</specifics>

<deferred>
## Deferred Ideas

- Debrief loop + `/api/debrief` route + DebriefPanel UI — Phase 4
- "End run" button to terminate session and trigger debrief — Phase 4
- Mil-spec aesthetic, amber HUD, mono header, callsign banner — Phase 5
- Bandpass filter on TTS audio for radio comms feel — Phase 5
- Latency tightening — Phase 5
- Vercel deploy — Phase 5
</deferred>

---

*Phase: 03-jtac-pilot-persona-grid-bridge*
*Context gathered: 2026-05-09 — bypassed /gsd-discuss-phase due to 6h sprint constraint and detailed intel/original-plan.md*
