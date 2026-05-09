# Requirements: jtac-trainer

**Defined:** 2026-05-09
**Core Value:** A wrong voice transmission produces a visible, consequential miss on screen.

## v1 Requirements

### Voice Pipeline

- [ ] **VOICE-01**: ws-server boots locally with DashScope creds and accepts WebSocket connections
- [ ] **VOICE-02**: Frontend connects to ws-server via `useRealtimeVoice` hook (copied from nim-kaleb)
- [ ] **VOICE-03**: Push-to-talk captures mic audio, streams PCM16 to ws-server, receives transcript back
- [ ] **VOICE-04**: ws-server streams LLM reply through TTS; frontend plays audio response

### 3D Scene

- [ ] **SCENE-01**: react-three-fiber renders fullscreen scene with terrain plane, target (free GLB), friendlies billboard
- [ ] **SCENE-02**: Fixed-position camera at observation post; PointerLock or clamped Orbit for mouse look
- [ ] **SCENE-03**: HUD reticle (CSS overlay) shows crosshair plus live 6-digit MGRS grid under aim point
- [ ] **SCENE-04**: `worldToGrid(x,z)` and `gridToWorld(str)` round-trip cleanly via raycast against ground plane
- [ ] **SCENE-05**: Scenario card visible in HUD corner; talk button overlaid on scene

### JTAC Persona + Grid Bridge

- [ ] **PILOT-01**: System prompt establishes "Hawg 21" A-10 pilot, clipped comms register, never breaks character
- [ ] **PILOT-02**: Pilot reads back lines 4 (heading), 6 (target location), 8 (friendlies) of the 9-line
- [ ] **PILOT-03**: When reading back line 6, LLM emits hidden `<grid>NNNNNN</grid>` tag matching transmitted grid
- [ ] **PILOT-04**: ws-server regex-extracts `<grid>(\d{6})</grid>` from LLM stream, emits `{type:'grid.transmitted', grid}` to client, strips tag from text before TTS
- [ ] **PILOT-05**: Frontend triggers `BombImpact` at `gridToWorld(grid)` on `grid.transmitted` (or after "rifle/bombs away" cue)
- [ ] **PILOT-06**: Correct transmitted grid → impact ring overlaps target; wrong grid → impact lands away from target

### Debrief

- [ ] **BRIEF-01**: Transcript captured turn-by-turn during run
- [ ] **BRIEF-02**: Outcome captured: distance from impact to target, distance from impact to friendlies
- [ ] **BRIEF-03**: "End run" button POSTs transcript + outcome to `/api/debrief`
- [ ] **BRIEF-04**: `/api/debrief` calls DashScope LLM (non-streaming, no TTS), returns `{verdict, critique}`
- [ ] **BRIEF-05**: `DebriefPanel` renders prose critique + verdict badge (solid/needs_work/unsafe)
- [ ] **BRIEF-06**: Bad-grid run produces "needs_work" or "unsafe" verdict that references the miss

### Polish + Deploy

- [ ] **POLISH-01**: Mil-spec aesthetic — mono font, amber/green HUD on dark background, callsign header
- [ ] **POLISH-02**: Optional bandpass filter (300–3000 Hz) on TTS output for radio comms feel
- [ ] **POLISH-03**: Latency under ~800 ms TTFA; reduce history window if exceeded
- [ ] **DEPLOY-01**: `vercel --prod` succeeds; `NEXT_PUBLIC_WS_URL=wss://ws.kalebnim.dev/ws` set
- [ ] **DEPLOY-02**: Deployed URL completes full demo loop on phone hotspot in <2 min, no console errors

### Submission

- [ ] **SUBMIT-01**: 60–90 s screen-recording backup exists in case of demo failure
- [ ] **SUBMIT-02**: Minimal README with what / how-to-run / why-vibes-debrief
- [ ] **SUBMIT-03**: Submitted to luma form before deadline

## v2 Requirements

(None — single-shot hackathon submission)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real MGRS coordinate math | Hours of work; fake 6-digit grid achieves identical demo signal |
| Per-line 9-line JSON parsing | Only line 6 grid needs structure; rest is vibes |
| Terrain heightmap / displacement | Flat plane is sufficient for demo readability |
| Multiple scenarios / scenario picker | Single hardcoded scenario; picker is scope creep |
| Auth / persistence / user accounts | Judges open URL and play |
| Player movement (walking) | Fixed observation-post pose only |
| Safari support | Mic permission flakiness; document Chrome-only |
| Real-time per-line scoring | Vibes-based debrief covers it |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VOICE-01 | Phase 1 | Pending |
| VOICE-02 | Phase 1 | Pending |
| VOICE-03 | Phase 1 | Pending |
| VOICE-04 | Phase 1 | Pending |
| SCENE-01 | Phase 2 | Pending |
| SCENE-02 | Phase 2 | Pending |
| SCENE-03 | Phase 2 | Pending |
| SCENE-04 | Phase 2 | Pending |
| SCENE-05 | Phase 2 | Pending |
| PILOT-01 | Phase 3 | Pending |
| PILOT-02 | Phase 3 | Pending |
| PILOT-03 | Phase 3 | Pending |
| PILOT-04 | Phase 3 | Pending |
| PILOT-05 | Phase 3 | Pending |
| PILOT-06 | Phase 3 | Pending |
| BRIEF-01 | Phase 4 | Pending |
| BRIEF-02 | Phase 4 | Pending |
| BRIEF-03 | Phase 4 | Pending |
| BRIEF-04 | Phase 4 | Pending |
| BRIEF-05 | Phase 4 | Pending |
| BRIEF-06 | Phase 4 | Pending |
| POLISH-01 | Phase 5 | Pending |
| POLISH-02 | Phase 5 | Pending |
| POLISH-03 | Phase 5 | Pending |
| DEPLOY-01 | Phase 5 | Pending |
| DEPLOY-02 | Phase 5 | Pending |
| SUBMIT-01 | Phase 6 | Pending |
| SUBMIT-02 | Phase 6 | Pending |
| SUBMIT-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-09*
*Last updated: 2026-05-09 after ingesting original-plan.md*
