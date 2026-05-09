# JTAC CAS 9-Line Voice Trainer

## What This Is

A voice-first roleplay trainer for Joint Terminal Attack Controllers (JTACs) practicing CAS (Close Air Support) 9-line briefs. The user surveys terrain in a 3D first-person view, transmits a 9-line brief aloud to "Hawg 21" (an A-10 pilot agent), and watches the bomb impact at whatever grid the transmission communicated. A wrong grid produces a visible miss — or worse, a friendly-fire incident.

Built for the **AIE Open Canvas Hackathon** (luma.com/aie-hack) as a 6-hour sprint. Recreates Medkit's winning formula in the air-traffic / CAS domain: voice-first, role-immersive, structured-debrief, demo-able loop in <2 minutes.

## Core Value

A CAS 9-line normally takes weeks of classroom + simulator time to drill. This collapses the loop to "speak it → see the bomb land → get coached" in 90 seconds, with visceral consequence (visible miss / friendly fire) replacing abstract scoring.

## The Demo Loop (<2 min)

1. Open URL → 3D FPS scene, target visible, reticle shows live "MGRS" grid, scenario card in corner
2. Hold-to-talk → user transmits 9-line aloud as JTAC
3. AI pilot reads back lines 4/6/8, asks one clarification, calls "in hot"
4. Bomb impacts at the grid the pilot's transcript contained
5. "End run" → instructor-style prose debrief + verdict badge

## Architecture

```
Browser (Vercel)              Alibaba Cloud ECS              DashScope APIs
┌─────────────────────┐      ┌────────────────────┐         ┌─────────────┐
│ Next.js 16 + R3F    │◄wss──│ Bun WS Server      │◄──ws───►│ ASR (STT)   │
│ 3D scene + voice    │      │ Session Manager    │◄──http─►│ LLM (qwen+) │
│ HUD reticle, bomb   │      │ Pipeline + grid tag│◄──ws───►│ TTS         │
└─────────────────────┘      │ extraction         │         └─────────────┘
                             └────────────────────┘
```

The 3-WebSocket pipeline is reused verbatim from `nim-kaleb`. Net-new: 3D scene, JTAC pilot persona, `<grid>` tag bridge from voice transcript to bomb impact, vibes-based debrief endpoint.

## Constraints

- **Time**: 6 hours total, including deploy + submission
- **Provider**: Alibaba DashScope (reuses existing API key + ws-server infra at ws.kalebnim.dev)
- **Runtime**: Bun (not npm/node)
- **Demo target**: Vercel-deployed URL, ws-server on existing ECS
- **Browser**: Chrome desktop (Safari mic permissions are flaky)

## Key Decisions

| Decision | Rationale |
|---|---|
| User = JTAC, AI = pilot | User practices the *transmitting* role — the part that needs drilling |
| Vibes-based debrief, no per-line JSON | 6h sprint; bomb-impact outcome is the objective signal, prose critique reads like an instructor |
| Single fixed scenario | Demo reliability > variety; eliminates LLM scenario-gen failure surface |
| Keep DashScope, swap voice ID | ws-server already working end-to-end; rewriting TTS layer = ~1.5h risk |
| 3D over 2D map | The visceral hook — bombs landing where you *said* — needs spatial first-person framing |
| Faked MGRS via raycast | Real MGRS math eats 1h+ for zero demo lift |
| `<grid>` tag in LLM stream | Single source of truth (transcript), zero extra API calls, ~30 min to wire |
| New repo (not nim-kaleb branch) | Cleaner submission — judges don't see Kaleb's portfolio code |

## Current Milestone: v0.1 Hackathon Submission

**Goal**: Ship a working Vercel-deployed JTAC trainer in 6 hours that satisfies the <2-min demo loop end-to-end.

**Phases**: 6 phases, each time-boxed 45–90 min. See `ROADMAP.md`.

## Evolution

This document evolves only at milestone boundaries. After the hackathon submission, post-event learnings go into `STATE.md`.

---
*Last updated: 2026-05-09 at project init*
