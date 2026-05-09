# Roadmap: JTAC CAS 9-Line Voice Trainer

## Milestones

- 🚧 **v0.1 Hackathon Submission** — Phases 1-6 (in progress, 6h sprint, 2026-05-09)

## Phases

### Phase 1: Voice Scaffold (45 min) — ✅ partial (commit 05d3fe6)

**Goal**: Frontend can speak to the AI pilot stub and hear a reply end-to-end via the ws-server.

**Depends on**: Nothing (first phase)

**Requirements**: VOICE-01, VOICE-02

**Tasks**:
- [x] Scaffold `jtac-trainer/` Next.js 16 app with bun
- [x] Copy `ws-server/` from nim-kaleb verbatim
- [x] Copy `useRealtimeVoice.ts` + audio utils into `src/hooks/`
- [x] Stub `prompts/system-prompt.md` with placeholder pilot
- [ ] Wire bare page with talk button
- [ ] Boot ws-server locally (DASHSCOPE_API_KEY + DASHSCOPE_VOICE_ID)
- [ ] Confirm voice round-trips (speak "test" → hear reply)

**Gate**: Voice round-trip works; transcript events fire.

---

### Phase 2: 3D Scene (90 min)

**Goal**: First-person 3D scene with terrain, target, friendlies, mouse-look, and a HUD reticle showing live grid.

**Depends on**: Phase 1

**Requirements**: SCENE-01, SCENE-02, SCENE-03, SCENE-04

**Tasks**:
- `bun add three @react-three/fiber @react-three/drei zustand`
- Build `Terrain.tsx`, `Target.tsx` (free GLB), `Friendlies.tsx`
- `JTACController.tsx` — PointerLockControls, fixed hilltop pose
- `Reticle.tsx` HUD — crosshair + live MGRS readout via Zustand store
- `lib/grid.ts` — `worldToGrid` / `gridToWorld` (fake 6-digit MGRS)
- `lib/raycast.ts` — camera forward → ground plane intersection → world coord
- `ScenarioCard.tsx` overlaid in corner

**Gate**: Mouse-look works, target visible, reticle MGRS string changes as camera rotates, `gridToWorld(worldToGrid(p)) ≈ p`.

**Tripwire**: If at 60 min the target isn't on screen with reticle working → fall back to 2D Canvas top-down map (~45 min replacement scope).

---

### Phase 3: JTAC Pilot Persona + Grid Bridge (60 min)

**Goal**: AI pilot stays in character, reads back lines 4/6/8, emits `<grid>` tag, and the bomb impacts at the transmitted grid.

**Depends on**: Phases 1, 2

**Requirements**: PERS-01, PERS-02, PERS-03, PERS-04, BRIDGE-01, BRIDGE-02, BRIDGE-03, BRIDGE-04

**Tasks**:
- Real `prompts/system-prompt.md`: Hawg 21 persona, comms register, behavior rules, grid-tag instruction with 1-2 few-shot examples
- Edit `ws-server/src/session.ts`: regex-extract `<grid>(\d{6})</grid>` from LLM delta stream, emit `{type:'grid.transmitted', grid}` event, strip tag before TTS
- Frontend: subscribe to `grid.transmitted`, store in Zustand
- `BombImpact.tsx` — falling sphere → expanding orange ring + smoke at given world coord
- Trigger impact on "rifle"/"bombs away" detection in transcript, with 3s post-grid timer fallback

**Gate**: Read a 9-line aloud → bomb falls at the grid you transmitted; transmit a wrong grid → bomb misses target.

**Tripwire**: If `<grid>` tag is unreliable after few-shot tuning → fall back to post-call extraction LLM (45 min) or manual "release" button using last reticle grid.

---

### Phase 4: Debrief Loop (60 min)

**Goal**: End-of-run debrief panel rendering instructor-style critique that references the bomb impact.

**Depends on**: Phase 3

**Requirements**: DEBRIEF-01, DEBRIEF-02, DEBRIEF-03, DEBRIEF-04

**Tasks**:
- Capture transcript turn-by-turn in Zustand store
- Compute outcome: `impactDistanceToTarget`, `impactDistanceToFriendlies`
- "End run" button → POST `/api/debrief` with `{transcript, impactDistanceToTarget, impactDistanceToFriendlies}`
- `app/api/debrief/route.ts` — DashScope LLM (non-streaming) with debrief prompt → returns `{verdict, critique}`
- `prompts/debrief-prompt.md`
- `DebriefPanel.tsx` — verdict badge + prose

**Gate**: Full loop runs; deliberately bad grid produces `unsafe` or `needs_work` verdict that mentions the miss.

---

### Phase 5: Demo Polish + Vercel Deploy (60 min)

**Goal**: Mil-spec aesthetic, latency under 800ms TTFA, deployed Vercel URL works end-to-end.

**Depends on**: Phase 4

**Requirements**: VOICE-03, DEMO-01, DEMO-02

**Tasks**:
- Mil-spec HUD: mono font, amber/green-on-dark, callsign header, radio-static SFX on TX/RX
- BiquadFilter bandpass 300–3000Hz on TTS audio (radio-comms feel)
- Tighten system prompt with 2 dry-runs; cap max_tokens; trim history window 20→6 if latency exceeds budget
- `vercel --prod`, set `NEXT_PUBLIC_WS_URL=wss://ws.kalebnim.dev/ws`
- Test deployed URL on phone hotspot

**Gate**: Vercel URL works end-to-end; full loop <2 min; no console errors.

**Tripwire**: If Vercel WSS → ECS fails (CORS/cert issues) → fall back to running frontend locally on stage, point at ws.kalebnim.dev directly.

---

### Phase 6: Buffer + Submission (45 min)

**Goal**: Backup recording + submission complete.

**Depends on**: Phase 5

**Requirements**: DEMO-03

**Tasks**:
- 60–90s screen-recording of a clean run (kept as backup if live demo breaks)
- Minimal README polish (already drafted at project init)
- Submit to luma form

**Gate**: Submission confirmed; backup recording uploaded.

---

## Time Budget

| Phase | Time | Cumulative |
|---|---|---|
| 1. Voice Scaffold | 45m | 0:45 |
| 2. 3D Scene | 90m | 2:15 |
| 3. Persona + Grid Bridge | 60m | 3:15 |
| 4. Debrief Loop | 60m | 4:15 |
| 5. Polish + Deploy | 60m | 5:15 |
| 6. Buffer + Submission | 45m | 6:00 |

No headroom — every phase has a tripwire fallback documented above.
