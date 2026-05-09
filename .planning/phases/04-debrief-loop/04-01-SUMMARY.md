---
phase: 04-debrief-loop
plan: 01
subsystem: debrief
tags: [debrief, dashscope, qwen-plus, zustand, next-app-router, openai-sdk]
provides: [BRIEF-01, BRIEF-02, BRIEF-03, BRIEF-04, BRIEF-05, BRIEF-06]
requires: [phase-03]
affects: [phase-05]
tech-stack:
  added: [openai@^6.37.0]
  patterns:
    - "Next.js 16 App Router POST handler at src/app/api/debrief/route.ts"
    - "DashScope OpenAI-compat client (stream:false) module-scoped per route file"
    - "Server-side verdict computed BEFORE LLM call (anti-hallucination)"
    - "Playwright page.route() interception for offline-stable smoke"
    - "Dev hooks gated on NODE_ENV !== 'production' (mirrors BombImpact pattern)"
key-files:
  created:
    - src/lib/verdict.ts
    - src/app/api/debrief/route.ts
    - src/components/DebriefPanel.tsx
    - src/components/EndRunButton.tsx
    - debrief-smoke.ts
  modified:
    - src/lib/store.ts
    - src/hooks/useRealtimeVoice.ts
    - src/scene/JTACController.tsx
    - src/app/page.tsx
    - package.json
    - bun.lock
decisions:
  - "Verdict is computed server-side from numeric impact distances (computeVerdict) BEFORE the LLM call — LLM only writes prose. Prevents the badge from contradicting the critique."
  - "no_strike short-circuits without an LLM call — instant + deterministic for the impact==null case."
  - "On LLM error, /api/debrief still returns 200 with verdict + fallback critique so the UI never blocks on a third-party hiccup."
  - "R-key uses the new useStore.endRun() atomic action instead of three separate setters — also clears transcript + debrief (Pitfall 3 guard for back-to-back Take A → Take B without a page reload)."
  - "Pilot transcript append is gated on (!isImmediate && buffered) but NOT on sessionIdRef — debrief works even if the analytics session start failed."
  - "debrief-smoke intercepts /api/debrief via page.route() so the smoke is offline-stable and verdict text is deterministic — does NOT exercise the live qwen-plus path. Live path is verified via Wave 2 curl gate."
metrics:
  duration: 6m26s
  tasks_completed: 8
  files_created: 5
  files_modified: 6
  completed: 2026-05-09T05:44:22Z
verified_via:
  - "bunx tsc --noEmit (frontend)"
  - "cd ws-server && bunx tsc --noEmit"
  - "bun -e store smoke (appendTurn x2 + endRun → STORE_OK)"
  - "bun -e verdict 5-case assertion (VERDICT_OK)"
  - "curl /api/debrief no_strike → instant {verdict:'no_strike', critique:'No ordnance released this run.'}"
  - "curl /api/debrief Take B (grid 599799, 19.7m friendlies) → {verdict:'unsafe', critique:'... 19.7 meters from friendlies ...'}"
  - "bun voice-smoke.ts (regression)"
  - "bun scene-smoke.ts (regression)"
  - "bun bomb-smoke.ts (regression — endRun() satisfies Test 4 reset assertion)"
  - "bun debrief-smoke.ts (TestA solid + TestB unsafe via page.route stub)"
---

# Phase 4 Plan 01: Debrief Loop Summary

**One-liner:** Closes the demo loop — `transcript[]` capture + `/api/debrief` POST handler (qwen-plus non-streaming via DashScope OpenAI-compat) + server-computed verdict + DebriefPanel modal with color-coded badge; bad-grid Take B (599799 → 19.7m off friendlies) surfaces as `unsafe` end-to-end.

## What Shipped

### Wave 1 — Store + transcript wiring + verdict thresholds
- **`src/lib/store.ts`** extended (preserving every Phase 3 field) with `transcript: TurnLog[]`, `debrief: Debrief`, and four new actions: `appendTurn`, `clearTranscript`, `setDebrief`, `endRun`. `endRun()` is a single atomic `set()` clearing transmittedGrid + lasedRange + impactResult + transcript + debrief.
- **`src/lib/verdict.ts`** (NEW) — pure `computeVerdict()` + `SOLID_TARGET_M=30` + `UNSAFE_FRIENDLIES_M=75`. Friendlies-≤75 dominates target-≤30 (boundary case verified: `{30, 75}` → `unsafe`).
- **`src/hooks/useRealtimeVoice.ts`** appends a `TurnLog` on `transcript.final` (after the analytics POST) and on `response.done` non-immediate (sibling guard to the analytics gate, using the snapshotted `buffered` BEFORE the line-237 ref clear — Pitfall 1 guard).
- **`src/scene/JTACController.tsx`** R-key handler swapped from three separate setters to `useStore.getState().endRun()` (Pitfall 3 guard against Take A turns polluting Take B debrief).

### Wave 2 — `/api/debrief` route
- **`bun add openai`** → `openai@^6.37.0` (matches ws-server's ^6 major).
- **`src/app/api/debrief/route.ts`** (NEW) — Next 16 App Router POST handler. Module-scope `OpenAI` client targeting `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`. Computes verdict via `computeVerdict()` BEFORE the LLM call; `no_strike` short-circuits without calling DashScope. Builds a labeled user payload (verdict, transmitted vs correct grid, distances, transcript). Calls `qwen-plus` with `stream:false`. Returns `{verdict, critique}`. On LLM error: still returns 200 with the server-computed verdict + a fallback critique (UI never blocks).

### Wave 3 — UI mount
- **`src/components/EndRunButton.tsx`** (NEW) — top-left HUD `[ END RUN ]` button (`data-testid="end-run"`). Disabled until `impactResult !== null`. On click: builds payload `{transcript, impact:{distanceToTarget, distanceToFriendlies, grid}, correctGrid:'599699'}`, POSTs `/api/debrief`, shoves response into `useStore.setDebrief()`. Flips to `[ ANALYZING... ]` while in flight, `[ NEW RUN ]` once debrief renders (then clicking it calls `endRun()`). Installs dev hooks `__appendTurn`, `__triggerEndRun`, `__getDebrief` (gated on `NODE_ENV !== 'production'`).
- **`src/components/DebriefPanel.tsx`** (NEW) — centered modal (`bg-black/90 border border-amber-700`, ~480px). Renders verdict badge (`data-testid="debrief-verdict"`, color-coded: green/amber/red/zinc) + critique paragraph (`data-testid="debrief-critique"`) + `[ NEW RUN ]` dismiss button wired to `endRun()`. Returns `null` when `debrief === null`.
- **`src/app/page.tsx`** — mounts `<EndRunButton />` and `<DebriefPanel />` after `<DebugPanel />`. `useRealtimeVoice()` still called exactly once (Phase 1 race-fix invariant preserved). Hidden h1 sr-only preserved (voice-smoke contract).

### Wave 4 — Smoke
- **`debrief-smoke.ts`** (NEW) — Playwright two-test regression. Intercepts `/api/debrief` via `page.route()` so the smoke is offline-stable (no DashScope dependency, deterministic critique text). TestA: grid 599699 → stub `{verdict:'solid'}` → assert badge text === `'solid'`. TestB: dismiss via NEW RUN → grid 599799 → stub `{verdict:'unsafe', critique:'... 19.7 m ...'}` → assert badge text === `'unsafe'` AND critique paragraph contains `'19'`.

## Verification Results

| Gate | Result |
|------|--------|
| `bunx tsc --noEmit` (frontend) | clean |
| `cd ws-server && bunx tsc --noEmit` | clean (no ws-server changes this phase) |
| Wave 1 store smoke (`bun -e`) | `STORE_OK` (appendTurn x2, length=2; endRun → all cleared) |
| Wave 1 verdict smoke (`bun -e`) | `VERDICT_OK` (5/5 cases including boundary) |
| Wave 2 curl no_strike | `{"verdict":"no_strike","critique":"No ordnance released this run."}` instant |
| Wave 2 curl Take B unsafe | `{"verdict":"unsafe","critique":"Verdict is unsafe—impact was 19.7 meters from friendlies. ..."}` (live qwen-plus call, ~3s) |
| `bun voice-smoke.ts` | PASSED |
| `bun scene-smoke.ts` | OK |
| `bun bomb-smoke.ts` | OK (Test 4 reset still satisfied by `endRun()`) |
| `bun debrief-smoke.ts` | OK (TestA solid + TestB unsafe + critique mentions '19') |

## Requirements Closed

- **BRIEF-01** ✓ — Each finalized voice turn appended to `useStore.transcript[]` (verified by debrief-smoke `__appendTurn` hook + EndRunButton payload build).
- **BRIEF-02** ✓ — Already shipped Phase 3 (`impactResult.distanceToTarget/distanceToFriendlies`); now consumed by EndRunButton.
- **BRIEF-03** ✓ — `[ END RUN ]` POSTs `{transcript, impact, correctGrid:'599699'}` to `/api/debrief` (verified by debrief-smoke route interception).
- **BRIEF-04** ✓ — `/api/debrief` returns `{verdict, critique}` from `qwen-plus` non-streaming call (verified by Wave 2 live curl).
- **BRIEF-05** ✓ — DebriefPanel renders verdict badge + critique paragraph (verified by debrief-smoke DOM assertions).
- **BRIEF-06** ✓ — Take B grid 599799 → impact 19.7m from friendlies → `verdict='unsafe'` → critique cites `19.7 meters from friendlies` in the live curl.

## Deviations from Plan

None — plan executed exactly as written. All 8 tasks, all 4 wave merge gates, and the phase exit gate passed on first attempt. The dev server was already running on :3000 (PID 31531, Next 16 with HMR) so no server lifecycle automation was needed.

## Self-Check: PASSED

- ✓ `src/lib/store.ts` extended (commit `32e04fc`)
- ✓ `src/lib/verdict.ts` created (commit `cc58abd`)
- ✓ `src/hooks/useRealtimeVoice.ts` + `src/scene/JTACController.tsx` modified (commit `00341ff`)
- ✓ `package.json` + `bun.lock` openai install (commit `8adc4cc`)
- ✓ `src/app/api/debrief/route.ts` created (commit `8512f9e`)
- ✓ `src/components/DebriefPanel.tsx` + `src/components/EndRunButton.tsx` created (commit `6e1fd03`)
- ✓ `src/app/page.tsx` mounts both (commit `448150f`)
- ✓ `debrief-smoke.ts` created (commit `80a61b0`)

All 8 commits verified in `git log`.

## Threat Flags

None — the verdict math executes server-side per T-04-01 mitigation; `DASHSCOPE_API_KEY` stays in `process.env` per T-04-02; transcript text reaches no new third-party flow per T-04-04; LLM output is rendered as plain text in `<p>{critique}</p>` per T-04-05 (React auto-escapes — no XSS surface).
