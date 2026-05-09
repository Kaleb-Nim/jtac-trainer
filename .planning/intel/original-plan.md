# Plan: JTAC CAS 9-Line Voice Trainer with 3D FPS Scene — AIE Open Hackathon (6h sprint)

## Context

The AIE Open Canvas Hackathon (luma.com/aie-hack) is a 6-hour sprint. Medkit's winning formula was: **voice-first, role-immersive, structured debrief, demo-able loop in <2 minutes.** We are recreating that shape for JTAC CAS 9-line training.

**The hook that makes this win, not just submit:** A first-person 3D scene where the user surveys terrain through a JTAC reticle, *speaks* a 9-line to an AI pilot, and **the bomb lands wherever the pilot's transcript said it should** — so a wrong grid produces a visible miss (or worse, lands near friendlies). The voice transmission has visceral consequence on screen. That's the punchline.

**The thesis:** Reuse the working 3-WebSocket voice pipeline from `nim-kaleb` so 6h goes to (a) the 3D scene, (b) the persona, (c) the bridge between voice transcript and bomb impact.

**The judge's <2-min loop:**
1. Open URL → 3D first-person view: terrain, enemy vehicle visible, reticle HUD shows live "MGRS" grid under crosshair, friendlies icon S of target, scenario brief in a corner card
2. Hold-to-talk → user transmits 9-line aloud as JTAC, reading line 6 (target location) off the reticle
3. AI pilot ("Hawg 21") reads back line 4/6/8, asks one clarification, calls "in hot"
4. Bomb falls from sky and impacts at **whatever grid the pilot's read-back contained** — visible splash + smoke
5. "End run" → debrief panel: instructor-style critique that references whether the round was on target / dangerously close to friendlies

## Decisions (locked)

| Decision | Choice |
|---|---|
| Roles | User = JTAC; AI = receiving pilot, callsign "Hawg 21" |
| Eval depth | Vibes-based prose debrief (no per-line JSON), but informed by bomb-impact outcome |
| Scenario | Single hardcoded: armor column at known grid, friendlies 800m S, no-strike zone E |
| TTS | Keep DashScope; swap voice ID; optional client-side bandpass filter for radio-comms feel |
| Repo | New repo `jtac-trainer/`, copy `ws-server/`, audio hook, audio utils from nim-kaleb |
| Deploy | Vercel frontend → existing `wss://ws.kalebnim.dev/ws` ws-server |
| 3D | react-three-fiber, low-poly stylized, faked MGRS from camera-raycast onto ground plane |
| Grid bridge | LLM emits `<grid>NNNNNN</grid>` tag in stream; ws-server parses; frontend triggers impact at that grid |

## Architecture

**Reused from nim-kaleb (copy as-is):**
- `ws-server/src/index.ts`, `ws-server/src/session.ts`, `ws-server/src/dashscope/{asr,llm,tts}.ts`
- `app/hooks/useRealtimeVoice.ts` + PCM16/audio utils

**New for JTAC trainer:**
- `app/scene/` — react-three-fiber scene
  - `Terrain.tsx` — flat plane (or simple displaced grid), grass material
  - `Target.tsx` — free GLB tank/T-72 from Poly Pizza or Sketchfab CC0; static
  - `Friendlies.tsx` — blue diamond billboard at fixed offset
  - `JTACController.tsx` — pointer-lock controls (mouse look, no movement) at fixed elevated position
  - `Reticle.tsx` — HUD overlay (CSS) with crosshair + live MGRS readout
  - `BombImpact.tsx` — falling sphere → expanding orange ring + smoke at given world coord
- `app/lib/grid.ts` — fake MGRS: world (x,z) ↔ 6-digit string. `worldToGrid(x,z)` = pad both to 3 digits each, concat. `gridToWorld(str)` = inverse.
- `app/lib/raycast.ts` — camera forward ray → ground plane intersection → world coord → grid
- `app/page.tsx` — single page composing scene + voice button + scenario card + debrief panel
- `app/components/ScenarioCard.tsx` — scenario brief
- `app/components/DebriefPanel.tsx` — post-run instructor prose + verdict badge
- `app/api/debrief/route.ts` — LLM call to generate debrief from transcript + impact outcome
- `prompts/system-prompt.md` — JTAC pilot persona, MUST emit `<grid>NNNNNN</grid>` when reading back line 6
- `prompts/debrief-prompt.md` — instructor critique prompt
- `ws-server/src/session.ts` — **one small edit**: regex-extract `<grid>(\d{6})</grid>` from LLM stream, emit `event: 'grid.transmitted', value: '123456'` to client. Strip the tag from the text before sending to TTS.

**Strategically NOT building:**
- Real MGRS math, terrain heightmap, or multiple scenarios
- Per-line 9-line JSON parsing (only the grid is structured)
- Auth, persistence, scenario picker
- Movement/walking — fixed FPS pose at observation post

## Phase breakdown (6 hours, time-boxed)

**Phase 1 — Voice scaffold (45 min)**
- `bun create next-app jtac-trainer` (TS, App Router, Tailwind)
- Copy `ws-server/` from nim-kaleb verbatim; verify it boots
- Copy `useRealtimeVoice.ts` + audio utils into `app/hooks/`
- Stub `prompts/system-prompt.md` with placeholder pilot
- Wire bare page with talk button, confirm voice round-trips against existing ws.kalebnim.dev OR local ws-server
- **Gate:** can speak, hear reply

**Phase 2 — 3D scene (90 min)**
- `bun add three @react-three/fiber @react-three/drei`
- Build `Terrain` + `Target` (free GLB) + `Friendlies` billboard
- `JTACController`: PointerLockControls or OrbitControls clamped, fixed camera at hilltop pose
- `Reticle.tsx` HUD: crosshair + live grid readout (subscribes to a Zustand store updated each frame from raycast)
- `app/lib/grid.ts` + `app/lib/raycast.ts`
- Render scene fullscreen; talk button + scenario card overlaid as HUD
- **Gate:** mouse-look works, target visible, reticle shows changing 6-digit grid

**Phase 3 — JTAC pilot persona + grid bridge (60 min)**
- Real `prompts/system-prompt.md`: "Hawg 21" A-10 pilot, comms register (clipped, "copy", "tally", "say again"), behavior rules:
  - Read back at least lines 4 (heading), 6 (target location), 8 (friendlies)
  - When reading back line 6, MUST emit hidden tag `<grid>NNNNNN</grid>` exactly as transmitted
  - Ask for clarification ONCE if any line is ambiguous
  - Call "in hot" before strike, "rifle/bombs away" at release, never break character
- Edit `ws-server/src/session.ts`: regex extract `<grid>(\d{6})</grid>` from LLM delta stream, emit `{type: 'grid.transmitted', grid}` to client, strip tag from text before TTS
- Frontend: on `grid.transmitted` event, store the grid; on next "rifle/bombs away" cue (or after a 3s timer post-grid), trigger `BombImpact` at `gridToWorld(grid)`
- **Gate:** read a 9-line aloud → bomb falls at the grid you transmitted; transmit a wrong grid → bomb misses

**Phase 4 — Debrief loop (60 min)**
- Capture transcript turn-by-turn (already produced by Session as `transcript.final`)
- Capture outcome: distance from impact to true target, distance from impact to friendlies
- "End run" button → POST `{transcript, impactDistanceToTarget, impactDistanceToFriendlies}` to `/api/debrief`
- Server route calls DashScope LLM (non-streaming, no TTS) with debrief prompt → returns `{verdict: 'solid'|'needs_work'|'unsafe', critique: string}`
- `DebriefPanel.tsx` renders critique + verdict badge
- **Gate:** full loop runs; bad grid produces "unsafe"/"needs_work" verdict that mentions the miss

**Phase 5 — Demo polish + Vercel deploy (60 min)**
- Mil-spec aesthetic: mono font, amber/green HUD on dark, callsign header, simple radio-static SFX on TX/RX
- Optional: BiquadFilter bandpass 300–3000Hz on TTS audio output for radio feel
- Tighten system prompt with 2 dry-runs; cut anything that makes pilot too chatty
- Latency check: target <800ms TTFA; if worse, drop history window 20→6, max_tokens cap
- `vercel --prod`, set `NEXT_PUBLIC_WS_URL=wss://ws.kalebnim.dev/ws`
- Test deployed URL on phone hotspot
- **Gate:** Vercel URL works end-to-end, full loop <2 min, no console errors

**Phase 6 — Buffer + submission (45 min)**
- 60–90s screen-recording backup
- Minimal README (what / how to run / why vibes-based debrief)
- Submit to luma form
- Slack in 5–10 min if everything's smooth — every prior phase will overrun

**Total: 6h, ~no buffer.** Risk is real; mitigations baked into each gate.

## Critical files

**Source (read-only reference):**
- `/Users/kalebnim/Documents/GitHub/nim-kaleb/ws-server/src/session.ts`
- `/Users/kalebnim/Documents/GitHub/nim-kaleb/ws-server/src/index.ts`
- `/Users/kalebnim/Documents/GitHub/nim-kaleb/app/hooks/useRealtimeVoice.ts`
- `/Users/kalebnim/Documents/GitHub/nim-kaleb/prompts/system-prompt.md` (pattern, not content)

**To be created in `jtac-trainer/`:**
- `prompts/system-prompt.md`, `prompts/debrief-prompt.md`
- `app/page.tsx`
- `app/scene/{Terrain,Target,Friendlies,JTACController,Reticle,BombImpact}.tsx`
- `app/lib/{grid,raycast}.ts`
- `app/components/{ScenarioCard,DebriefPanel}.tsx`
- `app/hooks/useRealtimeVoice.ts` (copied)
- `app/store.ts` (Zustand: current reticle grid, transmitted grid, transcript, impact result)
- `app/api/debrief/route.ts`
- `ws-server/` (copied; one small `session.ts` edit for grid tag extraction)

## Verification (end-to-end)

1. **Voice smoke:** local ws-server + `bun dev` → press talk, say "test" → transcript + voice reply
2. **Scene smoke:** target visible, mouse-look changes the reticle MGRS readout, grid round-trips through `worldToGrid`/`gridToWorld`
3. **Persona check:** read full 9-line; pilot reads back lines 4/6/8 in character, emits `<grid>` tag, stays clipped
4. **Bomb-on-target:** transmit the *correct* grid (read off reticle pointed at target) → impact ring overlaps target
5. **Bomb miss:** transmit a deliberately wrong grid → impact lands away from target; debrief calls it out
6. **Friendly-fire path:** transmit a grid near friendlies → impact near friendlies → debrief verdict = "unsafe"
7. **Demo timing:** stopwatch from "judge clicks URL" to "debrief on screen" — must be <2 min
8. **Deployed URL:** open Vercel URL on phone hotspot; full loop works; document "Chrome desktop recommended" if Safari mic fails

## Risk register

- **3D scene overruns 90 min** → fallback: replace 3D with 2D Canvas top-down map (Phase 2 becomes ~45 min). Pre-decision tripwire: if at 60 min the target isn't on screen with reticle working, switch.
- **LLM doesn't reliably emit `<grid>` tag** → mitigation: few-shot examples in system prompt; fallback: post-call extraction LLM (45 min) or manual "release" button using last reticle grid
- **DashScope outage during demo** → backup screen recording (Phase 6)
- **Mic permissions on Safari** → Chrome-recommended note in README + on landing page
- **Vercel WSS → ECS fails** (CORS, certs) → fallback: run frontend locally on stage, point at ws.kalebnim.dev
- **Scope creep into "make it pretty"** → hard cap: amber HUD + mono font + 1 SFX, nothing else
