# jtac-trainer

A voice-first JTAC CAS 9-line trainer for the AIE Open Canvas Hackathon (luma.com/aie-hack).

**The loop:** Survey terrain in a 3D first-person view. Speak a 9-line CAS brief to "Hawg 21" (an A-10 pilot agent). The bomb impacts wherever your transmission said it should — so a wrong grid produces a visible miss. End the run for an instructor-style debrief.

Built on the 3-WebSocket DashScope voice pipeline (ASR → LLM → TTS) reused from `nim-kaleb`.

## Run

```bash
# 1. ws-server (Bun, port 8080)
cd ws-server
bun install
DASHSCOPE_API_KEY=... DASHSCOPE_VOICE_ID=... bun src/index.ts

# 2. frontend (Next.js, port 3000)
bun install
bun dev
```

Open <http://localhost:3000> in **Chrome desktop** (Safari mic permissions are flaky).

## Stack

- **Frontend:** Next.js 16 (App Router) + react-three-fiber + Tailwind v4
- **Voice pipeline:** Bun WebSocket server brokering Alibaba DashScope ASR/LLM/TTS
- **Deploy:** Vercel (frontend) → ECS (ws-server) at `wss://ws.kalebnim.dev/ws`

## Why "vibes-based" debrief?

6-hour sprint. Per-line 9-line JSON parsing eats the budget for marginal demo lift. The bomb-impact outcome is the objective signal; the LLM debrief reads it and writes prose like an instructor would. See `.claude/plans/entering-the-aie-open-enumerated-bentley.md`.
