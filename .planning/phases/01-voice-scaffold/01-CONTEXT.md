# Phase 1: Voice scaffold — Context

**Gathered:** 2026-05-09
**Status:** Ready for planning
**Source:** Distilled from `.planning/intel/original-plan.md` + on-disk audit of jtac-trainer scaffold

<domain>
## Phase Boundary

This phase reaches the gate: **user can press a talk button in the Next.js app, speak into the mic, and hear an AI voice reply.** It does NOT include the 3D scene (Phase 2), the JTAC pilot persona (Phase 3 replaces the stub), the `<grid>` tag bridge (Phase 3), or the debrief loop (Phase 4). The page can be ugly — it's a smoke-test page, not the demo UI.

Time budget: 45 minutes.

</domain>

<decisions>
## Implementation Decisions

### Voice pipeline
- Reuse `ws-server/` from sibling repo `nim-kaleb` **verbatim** (already copied; `diff -rq` confirms identical to source). No edits this phase. The single allowed edit (regex-extract `<grid>`) lands in Phase 3.
- Reuse `src/hooks/useRealtimeVoice.ts` from nim-kaleb (already copied). One small refactor allowed: remove its dependency on `useTerminalState` (which doesn't exist in jtac-trainer) — make the `transitionTo` callback optional or stub it.
- Audio utils stay inlined inside `useRealtimeVoice.ts` (matches nim-kaleb pattern; no separate `lib/` extraction).

### Env var contract
- Canonical name: **`NEXT_PUBLIC_WS_URL`** (matches `.env.example`). The hook currently reads `NEXT_PUBLIC_WS_SERVER_URL` — fix the hook to read `NEXT_PUBLIC_WS_URL` so there's a single name across the codebase.
- Default value: `ws://localhost:8080/ws` (local dev). Production will set `wss://ws.kalebnim.dev/ws` in Phase 5.
- Server-side: `DASHSCOPE_API_KEY`, `DASHSCOPE_VOICE_ID` consumed by ws-server only.

### Page UI
- Replace boilerplate `src/app/page.tsx` with a minimal client component:
  - Single push-to-talk button (hold-to-talk OR click-to-toggle — pick whichever the existing hook exposes)
  - Live transcript text rendered below the button
  - Live AI response text rendered below the transcript
  - Phase indicator (idle / connecting / listening / responding / error) for debugging
- Tailwind v4 styling: dark background, mono font, single centered button. Aesthetic polish is Phase 5.

### Smoke-test target
- ws-server boots locally with `DASHSCOPE_API_KEY` + `DASHSCOPE_VOICE_ID` set, listens on port 8080.
- Frontend at `localhost:3000` connects to `ws://localhost:8080/ws`, captures mic, streams audio, receives transcript + TTS audio playback.
- Acceptable to use the existing prompts/system-prompt.md stub ("Hawg 21, copy") for Phase 1 — the persona work is Phase 3.

### Out of scope this phase
- 3D scene, react-three-fiber, reticle, scenario card
- Pilot persona behavior (just needs ANY voice reply)
- `<grid>` tag extraction
- Vercel deploy or deployed ws-server testing
- Aesthetic polish (mono font + dark bg only, nothing more)

### Claude's Discretion
- Whether to keep `transitionTo` as an optional prop or hardcode a no-op in the hook
- Exact button interaction (push-to-talk vs click-to-toggle) — match what the hook already implements
- Whether to display phase/error state inline or use a small status pill
- Tailwind class choices for the minimal page
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Reference implementation (read-only — sibling repo)
- `/Users/kalebnim/Documents/GitHub/nim-kaleb/ws-server/src/index.ts` — server entry, port + WS upgrade
- `/Users/kalebnim/Documents/GitHub/nim-kaleb/ws-server/src/session.ts` — DashScope ASR/LLM/TTS orchestration (Phase 3 will edit this in jtac-trainer)
- `/Users/kalebnim/Documents/GitHub/nim-kaleb/app/hooks/useRealtimeVoice.ts` — reference for the hook (already copied)
- `/Users/kalebnim/Documents/GitHub/nim-kaleb/app/hooks/useTerminalState.ts` — the dependency that's referenced but NOT copied; consult to decide whether to copy it or refactor away

### Project files to read
- `./AGENTS.md` — Next.js 16 has breaking changes; consult `node_modules/next/dist/docs/` before writing App Router code
- `./CLAUDE.md` — points at AGENTS.md
- `./.env.example` — env var contract
- `./src/hooks/useRealtimeVoice.ts` — current state (has stale import + wrong env var name)
- `./src/app/page.tsx` — boilerplate to replace
- `./src/app/layout.tsx` — keep as-is unless mono font needs to be wired here
- `./prompts/system-prompt.md` — Phase 1 stub already in place
- `./ws-server/src/index.ts` and `./ws-server/src/session.ts` — already copied verbatim; do not modify this phase
- `./.planning/PROJECT.md`, `./.planning/REQUIREMENTS.md`, `./.planning/ROADMAP.md` — project context
- `./.planning/intel/original-plan.md` — full sprint plan
</canonical_refs>

<specifics>
## Specific Ideas

- Hook fix: change line `process.env.NEXT_PUBLIC_WS_SERVER_URL ?? 'ws://localhost:8080'` to `process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080/ws'` so it matches `.env.example` AND includes the `/ws` path the server upgrades on.
- Hook fix: remove `import type { TerminalState, TerminalStateMetadata } from '@/app/hooks/useTerminalState'` and either (a) make `transitionTo` optional (`transitionTo?: (state: string, meta?: unknown) => void`) and call it with `?.()`, or (b) copy `useTerminalState.ts` over from nim-kaleb if it provides any value the demo benefits from.
- Page composition: client component (`'use client'` directive), uses `useRealtimeVoice({ transitionTo: () => {} })` (or no-arg if refactored), renders one `<button>` + status text + `<pre>` blocks for transcript and response.
- ws-server boot: confirm `cd ws-server && bun install && DASHSCOPE_API_KEY=xxx DASHSCOPE_VOICE_ID=xxx bun src/index.ts` prints a "listening on :8080" line.
- Smoke test: open Chrome at localhost:3000, click talk, say "test one two", expect (a) transcript to populate, (b) AI response text to populate with "Hawg 21, copy" or similar, (c) audio to play.
</specifics>

<deferred>
## Deferred Ideas

- Persona behavior (full 9-line readback + clipped comms register) — Phase 3
- `<grid>NNNNNN</grid>` tag extraction in ws-server — Phase 3
- Mil-spec aesthetic (amber/green HUD, callsign header) — Phase 5
- Bandpass radio filter on TTS audio — Phase 5
- Vercel deploy — Phase 5
</deferred>

---

*Phase: 01-voice-scaffold*
*Context gathered: 2026-05-09 — bypassed /gsd-discuss-phase due to 6h sprint constraint and complete intel/original-plan.md*
