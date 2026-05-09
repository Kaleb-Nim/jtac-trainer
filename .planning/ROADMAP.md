# Roadmap: jtac-trainer

## Overview

Six phases time-boxed inside a 6-hour hackathon sprint. Phase 1 stands up the reused voice pipeline, Phase 2 builds the 3D scene, Phase 3 wires the JTAC pilot persona to the bomb-impact bridge (the punchline), Phase 4 closes the debrief loop, Phase 5 polishes and deploys to Vercel, Phase 6 buffers and submits. Each phase has an explicit gate; the plan assumes overruns and trips fallbacks early (e.g., 2D map if 3D scene runs long).

## Phases

- [x] **Phase 1: Voice scaffold** — Reuse nim-kaleb ws-server + voice hook; confirm round-trip
- [x] **Phase 2: 3D scene** — react-three-fiber scene with terrain, target, friendlies, reticle, live grid
- [x] **Phase 3: JTAC pilot persona + grid bridge** — Hawg 21 prompt + `<grid>` tag → bomb impact at transmitted grid
- [x] **Phase 4: Debrief loop** — Capture transcript+outcome, `/api/debrief` route, prose verdict UI
- [ ] **Phase 5: Demo polish + Vercel deploy** — Mil-spec aesthetic, latency tighten, ship to Vercel
- [ ] **Phase 6: Buffer + submission** — Backup recording, README, luma form

## Phase Details

### Phase 1: Voice scaffold
**Goal**: User can press talk in the scaffolded Next.js app and hear an AI voice reply via the reused ws-server pipeline.
**Depends on**: Nothing (first phase)
**Requirements**: VOICE-01, VOICE-02, VOICE-03, VOICE-04
**Success Criteria** (what must be TRUE):
  1. ws-server boots locally with DashScope creds, accepts WebSocket connections
  2. Frontend talk button captures mic audio, streams to ws-server, displays transcript
  3. ws-server LLM reply is spoken back through TTS audio in the browser
  4. Round-trip works against either local ws-server or `wss://ws.kalebnim.dev/ws`
**Plans**: 1 plan (45 min budget)

Plans:
- [x] 01-01: Wire reused ws-server + useRealtimeVoice into bare talk button page

### Phase 2: 3D scene
**Goal**: User opens the page and sees a fullscreen 3D scene with terrain, target, friendlies, and a HUD reticle that shows a live changing 6-digit MGRS grid as they mouse-look.
**Depends on**: Phase 1
**Requirements**: SCENE-01, SCENE-02, SCENE-03, SCENE-04, SCENE-05
**Success Criteria** (what must be TRUE):
  1. Mouse-look rotates camera; target GLB and friendlies billboard are visible
  2. Reticle HUD overlay shows crosshair plus live 6-digit grid string
  3. `worldToGrid`/`gridToWorld` round-trip cleanly via raycast against ground plane
  4. Talk button and scenario card overlay render on top of the scene without occluding action
**Plans**: 1 plan (90 min budget; fallback: swap 3D for 2D Canvas top-down map at 60-min tripwire)

Plans:
- [x] 02-01: Build r3f scene + reticle HUD + grid math + raycast

### Phase 3: JTAC pilot persona + grid bridge
**Goal**: User reads a 9-line aloud; pilot reads back lines 4/6/8 in clipped comms; the bomb falls at the grid the pilot's transcript actually contained — wrong grid produces a visible miss.
**Depends on**: Phase 2
**Requirements**: PILOT-01, PILOT-02, PILOT-03, PILOT-04, PILOT-05, PILOT-06
**Success Criteria** (what must be TRUE):
  1. System prompt yields in-character "Hawg 21" comms with reliable `<grid>NNNNNN</grid>` emission
  2. ws-server extracts grid tag, emits `grid.transmitted` event, strips tag before TTS
  3. Frontend renders `BombImpact` falling sphere → ring + smoke at `gridToWorld(grid)`
  4. Demonstrably: correct grid hits target, wrong grid misses
**Plans**: 1 plan (60 min budget)

Plans:
- [x] 03-01: System prompt + ws-server grid extraction + BombImpact wiring

### Phase 4: Debrief loop
**Goal**: User clicks "End run"; an instructor-style prose critique appears with a verdict badge that reflects whether the strike was on target / dangerously close to friendlies.
**Depends on**: Phase 3
**Requirements**: BRIEF-01, BRIEF-02, BRIEF-03, BRIEF-04, BRIEF-05, BRIEF-06
**Success Criteria** (what must be TRUE):
  1. Transcript and impact distances (to target, to friendlies) captured during run
  2. `/api/debrief` returns `{verdict, critique}` from non-streaming DashScope LLM call
  3. DebriefPanel renders the critique + verdict badge
  4. A bad-grid run produces a "needs_work" or "unsafe" verdict that mentions the miss
**Plans**: 1 plan (60 min budget)

Plans:
- [x] 04-01: Outcome capture + /api/debrief route + DebriefPanel

### Phase 5: Demo polish + Vercel deploy
**Goal**: A judge clicking the live Vercel URL completes the full loop in <2 min on Chrome desktop with no console errors and a passable mil-spec look.
**Depends on**: Phase 4
**Requirements**: POLISH-01, POLISH-02, POLISH-03, DEPLOY-01, DEPLOY-02
**Success Criteria** (what must be TRUE):
  1. Mono font + amber/green HUD on dark + callsign header visible
  2. TTFA latency under ~800 ms in production
  3. `vercel --prod` deploys with `NEXT_PUBLIC_WS_URL=wss://ws.kalebnim.dev/ws`
  4. Phone-hotspot test on deployed URL completes the loop without console errors
**Plans**: 1 plan (60 min budget)

Plans:
- [ ] 05-01: Aesthetic pass + latency tune + Vercel ship + smoke test

### Phase 6: Buffer + submission
**Goal**: Submission accepted on luma; backup recording exists; README explains the project.
**Depends on**: Phase 5
**Requirements**: SUBMIT-01, SUBMIT-02, SUBMIT-03
**Success Criteria** (what must be TRUE):
  1. 60–90 s screen-recording backup saved
  2. README contains what / how-to-run / why-vibes-debrief sections
  3. Submission confirmed on luma form
**Plans**: 1 plan (45 min budget)

Plans:
- [ ] 06-01: Record backup + finalize README + submit

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Voice scaffold | 1/1 | Complete | 2026-05-09 |
| 2. 3D scene | 1/1 | Complete | 2026-05-09 |
| 3. JTAC pilot persona + grid bridge | 1/1 | Complete | 2026-05-09 |
| 4. Debrief loop | 1/1 | Complete | 2026-05-09 |
| 5. Demo polish + Vercel deploy | 0/1 | Not started | - |
| 6. Buffer + submission | 0/1 | Not started | - |
