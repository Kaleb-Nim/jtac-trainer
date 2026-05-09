---
plan: 01-01
phase: 01-voice-scaffold
status: tasks-1-2-complete | task-3-pending-human-verify
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

## Task 3 — Pending human verification

The third task is a `checkpoint:human-verify` for the local mic round-trip. Audio cannot be auto-verified. Run the steps in `01-01-PLAN.md` Task 3 and report `approved` or the failing step.

Quick summary of what to do:
1. Terminal A: `cd ws-server && bun install && DASHSCOPE_API_KEY=xxx DASHSCOPE_VOICE_ID=xxx bun src/index.ts` → should print `[server] listening on port 8080`
2. Terminal B: `bun install && bun dev` → should print `Local: http://localhost:3000`
3. Make sure `.env.local` has `NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws` (create it if missing, restart dev)
4. Open `http://localhost:3000` in Chrome desktop, click Connect, allow mic, speak "test one two three", confirm transcript + AI response text + audio playback all work, click Disconnect.

If all 8 steps in the plan's `<how-to-verify>` section pass, type `approved` and we'll close Phase 1.
