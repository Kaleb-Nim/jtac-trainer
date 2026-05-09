# Requirements: JTAC CAS 9-Line Voice Trainer

Scoped for the v0.1 hackathon submission. Anything outside these requirements is explicitly out of scope.

## Voice Pipeline (VOICE)

- **VOICE-01** — User can press a talk button, speak, and receive an audio reply in <2s end-to-end (ASR → LLM → TTS round-trip)
- **VOICE-02** — Voice transcripts (user + AI) are captured turn-by-turn and accessible to the frontend
- **VOICE-03** — AI voice sounds clipped/comms-quality (radio register), not the default Kaleb clone — achieved by alternate DashScope voice ID and/or client-side bandpass filter

## Persona (PERS)

- **PERS-01** — AI plays "Hawg 21", an A-10 pilot in JTAC-pilot CAS register: "copy", "tally", "in hot", "rifle", "say again line N"
- **PERS-02** — Pilot reads back at least lines 4 (heading), 6 (target location), 8 (friendlies) of any received 9-line
- **PERS-03** — Pilot asks for clarification once if any line is ambiguous, then commits
- **PERS-04** — Pilot stays in character for the full session (never refers to itself as an AI/model)

## 3D Scene (SCENE)

- **SCENE-01** — First-person 3D scene renders fullscreen with terrain, one enemy target (T-72 or equivalent GLB), one friendlies marker offset 800m S
- **SCENE-02** — Mouse-look (PointerLockControls) rotates the camera at a fixed observation-post position; no walk movement
- **SCENE-03** — HUD reticle overlay shows a crosshair + live 6-digit grid string updating each frame from camera-forward raycast onto the ground plane
- **SCENE-04** — Scenario brief card visible in a screen corner throughout the run

## Voice → Visual Bridge (BRIDGE)

- **BRIDGE-01** — Pilot system prompt instructs the LLM to emit `<grid>NNNNNN</grid>` exactly when reading back line 6
- **BRIDGE-02** — ws-server regex-extracts `<grid>(\d{6})</grid>` from the LLM delta stream and emits a typed event to the client; the tag is stripped from the text before TTS
- **BRIDGE-03** — On `grid.transmitted` event, the frontend stores the grid; on the pilot's "rifle/bombs away" cue (or 3s post-grid as fallback), `BombImpact` triggers at `gridToWorld(grid)`
- **BRIDGE-04** — Bomb impact is visible: falling sphere → expanding orange ring + smoke at the world coord

## Debrief (DEBRIEF)

- **DEBRIEF-01** — "End run" button captures the full transcript + impact outcome (distance to target, distance to friendlies)
- **DEBRIEF-02** — `/api/debrief` LLM call returns `{verdict: 'solid'|'needs_work'|'unsafe', critique: string}` — non-streaming, no TTS
- **DEBRIEF-03** — `unsafe` verdict triggers when impact is within 200m of friendlies; `needs_work` when impact is >100m from target; `solid` otherwise
- **DEBRIEF-04** — Critique reads like an instructor, references the impact outcome, 4–6 sentences

## Demo Loop (DEMO)

- **DEMO-01** — Full loop (URL open → debrief on screen) completes in <2 minutes during a rehearsal
- **DEMO-02** — Frontend deployed to Vercel; ws-server reachable at `wss://ws.kalebnim.dev/ws`
- **DEMO-03** — Backup screen recording (60–90s) exists in case live demo fails

## Explicitly Out of Scope

- Per-line 9-line JSON parsing or doctrine citations (vibes-based debrief)
- Real MGRS math (proj4/mgrs lib) — using fake 6-digit grid from raycast
- Multiple scenarios / scenario picker / LLM-generated scenarios — single hardcoded
- Heightmap terrain, multiple targets, particle systems beyond a basic ring + smoke
- Auth, user accounts, persistence, history
- Local-model fallback (Whisper / Ollama / local TTS)
- Mobile / Safari support — Chrome desktop only
- Walking/movement — fixed observation-post pose
