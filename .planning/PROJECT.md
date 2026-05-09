# jtac-trainer

## What This Is

A voice-first JTAC CAS 9-line trainer for the AIE Open Canvas Hackathon. The user surveys terrain in a 3D first-person view, speaks a 9-line CAS brief to "Hawg 21" (an A-10 pilot agent), and the bomb impacts wherever the transmission said it should — wrong grid produces a visible miss. End-of-run produces an instructor-style debrief.

## Core Value

A wrong voice transmission produces a visible, consequential miss on screen — voice has stakes. If everything else fails, that loop must work.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Voice round-trips through reused 3-WebSocket DashScope pipeline (ASR → LLM → TTS)
- [ ] 3D first-person scene renders terrain, target, friendlies, with reticle showing live faked MGRS grid
- [ ] AI pilot persona ("Hawg 21") reads back lines 4/6/8 in clipped comms register
- [ ] LLM emits hidden `<grid>NNNNNN</grid>` tag; ws-server extracts, frontend triggers bomb impact at that grid
- [ ] Bomb impact is visible (falling sphere → ring + smoke); correct grid hits target, wrong grid misses
- [ ] End-run debrief calls `/api/debrief`, returns instructor critique + verdict (solid/needs_work/unsafe)
- [ ] Deployed to Vercel pointing at `wss://ws.kalebnim.dev/ws`; full demo loop completes in <2 min on a fresh URL open

### Out of Scope

- Real MGRS math — fake 6-digit grid from world coords is enough for the demo
- Per-line 9-line JSON parsing — only line 6 grid is structured; rest is vibes
- Terrain heightmap, multiple scenarios, scenario picker — single hardcoded scenario only
- Auth, persistence, user accounts — judges open URL and play
- Player movement — fixed observation-post pose, mouse-look only
- Safari support — Chrome desktop only (mic permission flakiness)

## Context

- 6-hour hackathon sprint (AIE Open Canvas, luma.com/aie-hack). Time is the dominant constraint.
- Reuses working 3-WebSocket voice pipeline from sibling repo `nim-kaleb` (ws-server, useRealtimeVoice hook, audio utils) so 6h goes to scene + persona + grid bridge.
- Medkit's winning hackathon pattern: voice-first, role-immersive, structured debrief, demo-able loop in <2 min — we are recreating that shape for JTAC.
- Existing scaffolded repo: Next.js 16 (App Router) + Tailwind v4 + react-three-fiber (TBD), `ws-server/` directory present, `prompts/system-prompt.md` stub present.
- Original detailed plan preserved at `.planning/intel/original-plan.md`.

## Constraints

- **Timeline**: 6-hour total budget, no buffer beyond Phase 6's 45 min
- **Tech stack**: Next.js 16 App Router, Bun (no npm/Node), react-three-fiber, Tailwind v4, react 19
- **Backend**: Bun WebSocket server reused as-is from nim-kaleb; only allowed edit is regex-extracting `<grid>` tag from LLM stream
- **Browser**: Chrome desktop only (Safari mic permissions unreliable for demo)
- **Deploy**: Vercel frontend → existing ECS ws-server at `wss://ws.kalebnim.dev/ws`
- **Voice provider**: Alibaba DashScope (ASR/LLM/TTS) — already wired, do not swap
- **Next.js**: Has breaking changes from training data; consult `node_modules/next/dist/docs/` per project AGENTS.md

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Roles: User=JTAC, AI=pilot "Hawg 21" | Pilot reads back grid → natural place to emit structured tag | — Pending |
| Vibes-based prose debrief (no per-line JSON) | Per-line parsing eats sprint budget for marginal demo lift | — Pending |
| Single hardcoded scenario (armor + friendlies S + no-strike E) | Scenario picker is scope creep | — Pending |
| Faked MGRS via camera-raycast → 6-digit grid | Real MGRS math is hours; fake grid achieves identical demo signal | — Pending |
| Grid bridge via `<grid>NNNNNN</grid>` tag in LLM stream | Single regex in ws-server; preserves prose-everywhere-else model | — Pending |
| Reuse nim-kaleb ws-server verbatim, one edit only | Avoids re-debugging known-working voice pipeline | — Pending |
| Deploy frontend on Vercel, ws-server stays on ECS | Existing wss endpoint already trusted | — Pending |

---
*Last updated: 2026-05-09 after ingesting .planning/intel/original-plan.md*
