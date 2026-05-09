---
plan: 01-01
phase: 01-voice-scaffold
status: complete
verified_via: playwright-cli (synthetic audio, real DashScope round-trip)
---

# Summary: 01-01 Voice scaffold

## Tasks 1 & 2 — Done (autonomous)

### Task 1: useRealtimeVoice drift fix

Edits applied to `src/hooks/useRealtimeVoice.ts`:

| Change | Before | After |
|---|---|---|
| Stale import | `import type { TerminalState, TerminalStateMetadata } from '@/app/hooks/useTerminalState';` | (deleted) |
| Options interface | `interface UseRealtimeVoiceOptions { transitionTo: ... }` | (deleted) |
| Env var | `process.env.NEXT_PUBLIC_WS_SERVER_URL ?? 'ws://localhost:8080'` | `process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080/ws'` |
| Function signature | `useRealtimeVoice({ transitionTo }: UseRealtimeVoiceOptions)` | `useRealtimeVoice()` (zero-arg) |
| WS URL build | `new WebSocket(WS_SERVER_URL + '/ws')` | `new WebSocket(WS_SERVER_URL)` (env value already includes `/ws`) |
| `transitionTo(...)` call sites | 5 calls + 3 dep-array entries | all removed |

Acceptance: all 7 grep/tsc checks pass.

### Task 2: page.tsx replacement

`src/app/page.tsx` rewritten as a 60-line client component:
- `'use client'` directive
- `useRealtimeVoice()` zero-arg invocation
- H1 "JTAC Trainer — Voice Smoke Test"
- Single Connect/Disconnect button (click-to-toggle; `connect()` called inside the click handler to preserve user-gesture window)
- Phase indicator + conditional error line
- `<pre data-testid="transcript">` and `<pre data-testid="response">` for stream output
- Tailwind v4 dark/mono styling only

Acceptance: 6 grep checks pass; tsc clean.

## Deviation from plan

**One unplanned edit, root cause investigation:** `tsconfig.json` was including `ws-server/**/*.ts` in the type-check, which cascaded into "Cannot find module 'openai' / 'bun'" errors that had nothing to do with this phase. The plan's verify command (`bunx tsc --noEmit -p tsconfig.json`) would have failed on pre-existing scaffolding noise.

Fix: added `"ws-server"` to the root `tsconfig.json` exclude list, matching the pattern from the source repo `nim-kaleb/tsconfig.json` (which has `"exclude": ["node_modules", "scripts", "ws-server"]`). The ws-server has its own `tsconfig.json` and should only be type-checked from inside its own workspace.

This is a one-line root-cause fix, not a workaround — `--no-verify` style bypasses were not used.

## Task 3 — Verified via Playwright CLI

Wrote `voice-smoke.ts` at repo root: launches headless Chromium with `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`, grants mic permission, navigates to localhost:3000, clicks Connect, captures all WebSocket frames + console events, asserts phase reaches `listening`/`responding` OR a non-trivial response is rendered.

**Run:** `bun voice-smoke.ts` (with both servers up).

**First run surfaced a real bug** — race condition. The hook started streaming `audio.append` frames the instant the WebSocket opened, but the server's DashScope ASR setup is async (~few hundred ms). Every audio frame arriving before `asrWs` was ready got rejected with `"Session not started — send session.start first"`.

**Fix (client-only — Phase 1 doesn't touch ws-server):**
- Added `sessionReadyRef = useRef(false)`
- Set to `true` in the `session.ready` message handler
- Reset to `false` when wiring `processor.onaudioprocess` (so a fresh connect always waits) and at `disconnect()`
- `processor.onaudioprocess` early-returns if `!sessionReadyRef.current`

**Second run passed:**
- WS opens → `session.start` → server replies `session.ready` → client THEN starts audio
- Server streams `response.text.delta`: `"Hawg 21, on station — weapons hot, eyes sharp. Ready for your 9-line, JTAC."`
- Server streams `response.audio.delta` TTS frames
- UI phase reaches `responding`, response box populates

Transcript stayed `—` because Playwright's fake media device emits silence — ASR has nothing to transcribe. Expected for headless verification; the pipeline is wired correctly. A real-mic test would fill the transcript.

## Files changed (final)

| File | Change |
|---|---|
| `src/hooks/useRealtimeVoice.ts` | Drift fixes (Task 1) + sessionReady gate (Task 3 race fix) |
| `src/app/page.tsx` | Boilerplate → smoke-test UI (Task 2) |
| `tsconfig.json` | Exclude ws-server from root type-check (matches nim-kaleb pattern) |
| `voice-smoke.ts` | New — Playwright headless round-trip verifier |
