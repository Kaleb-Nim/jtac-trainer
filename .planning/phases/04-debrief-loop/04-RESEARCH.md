# Phase 4: Debrief Loop — Research

**Researched:** 2026-05-09
**Domain:** Next.js App Router POST endpoint + DashScope (Qwen) non-streaming completion + Zustand state extension + overlay UI
**Confidence:** HIGH (all upstream contracts verified by reading shipped code; Next.js route convention verified against `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`)

## Summary

Phase 4 closes the demo loop. The runtime data the debrief needs is **already in the store and on the wire** — `useRealtimeVoice` carries `transcript` + `responseText` (single-utterance buffers, not turn-by-turn arrays), and `useStore.impactResult` already contains `distanceToTarget` + `distanceToFriendlies` written by `BombImpact.tsx` at impact time. Nothing in voice or scene needs to change beyond appending each finalized turn to a new `transcript[]` array in the store.

The new code is small and lives in three places:
1. **Store extension** — add `transcript: TurnLog[]`, `setTranscript/appendTurn/clearTranscript`, plus an `endRunAt` timestamp.
2. **`/api/debrief/route.ts`** — single POST handler. Reads `DASHSCOPE_API_KEY` from process.env, calls `qwen-plus` via the existing `openai` SDK pattern (`baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'`), `stream: false`, returns `{verdict, critique}`. Verdict is computed **server-side** from numeric distances in the request payload (deterministic) and the LLM only writes prose — this prevents the LLM from contradicting the badge.
3. **`DebriefPanel.tsx`** — modal overlay. "End run" button mounts in HUD; on click POSTs and renders the response.

**Primary recommendation:** Ship one plan, four waves: (1) store + transcript capture wiring, (2) `/api/debrief` route with server-computed verdict + LLM critique, (3) End-run button + DebriefPanel UI, (4) smoke test (`debrief-smoke.ts`) that injects a Take B grid via the existing dev hooks and asserts an `unsafe` verdict.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Per-turn transcript capture | Browser (Zustand) | — | Voice events already arrive in browser via `useRealtimeVoice`; mirroring to a server adds no value for a single-shot demo |
| Outcome capture (distance to target/friendlies) | Browser (Zustand `impactResult`) | — | Already written by `BombImpact.tsx` — no change |
| Verdict computation (numeric thresholds) | API (`/api/debrief`) | — | Deterministic; computed on server from payload distances — keeps badge in agreement with thresholds even if LLM hallucinates |
| Prose critique generation | API (`/api/debrief` → DashScope) | — | LLM call must hide `DASHSCOPE_API_KEY` from browser; existing ws-server pattern reused via the OpenAI-compat SDK |
| DebriefPanel render | Browser | — | Pure overlay; no SSR needed |
| End-run trigger | Browser (HUD button + dispatch) | — | Pairs with existing R-key reset semantics |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.6 [VERIFIED: package.json] | App Router `route.ts` POST handler | Already in repo; AGENTS.md mandates checking `node_modules/next/dist/docs/` because Next 16 has breaking changes from training data |
| `openai` | ^6.32.0 [VERIFIED: ws-server/package.json] | DashScope LLM client (OpenAI-compat) | Already used by ws-server; same pattern keeps env var + baseURL identical |
| `zustand` | ^5.0.13 [VERIFIED: package.json] | Transcript + impactResult state | Already the store layer; trivially extended |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `playwright` | ^1.59.1 [VERIFIED: package.json] | `debrief-smoke.ts` regression | Mirror `bomb-smoke.ts` pattern — drive UI via dev hooks, assert verdict via DOM text |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `openai` client in `src/app/api/debrief/route.ts` | Import shared module | Frontend has no `openai` dep installed; adding it for a single route is fine but a vendored helper would also work. **Recommend: install `openai` in the frontend root** (`bun add openai`) and instantiate locally — keeps the route self-contained. The frontend already runs analytics POST routes, so the pattern of "frontend Next.js calling out to providers" is established. |
| Server-computed verdict | Have LLM emit verdict | LLM can hallucinate / disagree with badge. Compute server-side from numeric distances. |
| Streaming SSE response | Single-shot JSON | Phase requirement BRIEF-04 is explicitly non-streaming ("calls DashScope LLM (non-streaming, no TTS), returns `{verdict, critique}`"). Single `await` simplifies UI state. |

**Installation:**
```bash
bun add openai
```

**Version verification:** `bunx npm view openai version` should be checked at install time. ws-server is on `^6.32.0` and works with the DashScope intl baseURL — pin to the same major. [ASSUMED — not re-verified against npm registry in this session]

## Architecture Patterns

### System Architecture Diagram

```
                         ┌────────────────────────────────────────┐
                         │  BROWSER (Next.js client)              │
                         │                                        │
   user voice ─► useRealtimeVoice ─► transcript.final ─┐         │
                                                       ▼         │
                                          appendTurn() to store  │
                                                                  │
   ws-server ──► grid.transmitted ──► setTransmittedGrid ─► BombImpact
                                                              │   │
                                                              ▼   │
                                                   setImpactResult│
                                                                  │
                         ┌─[End run button click]───────────────┐ │
                         │                                      │ │
                         │  build payload {                     │ │
                         │    transcript: TurnLog[],            │ │
                         │    impact: ImpactResult,             │ │
                         │    correctGrid: '599699',            │ │
                         │  }                                   │ │
                         └──────┬───────────────────────────────┘ │
                                │                                  │
                                ▼  POST /api/debrief               │
        ┌──────────────────────────────────────────────────────┐  │
        │  Next.js route handler (server)                      │  │
        │                                                       │  │
        │  1. Validate payload                                  │  │
        │  2. Compute verdict server-side from impact distances │  │
        │     (solid|needs_work|unsafe)                         │  │
        │  3. Build instructor system prompt + payload summary  │  │
        │  4. await openai.chat.completions.create({            │  │
        │       model: 'qwen-plus',                             │  │
        │       stream: false,                                  │  │
        │       baseURL: dashscope-intl ...                     │  │
        │     })                                                │  │
        │  5. return Response.json({verdict, critique})         │  │
        └──────────────────────────────────────────────────────┘
                                │
                                ▼
                         setDebrief() ─► <DebriefPanel/> renders
```

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── debrief/
│   │       └── route.ts          # NEW — POST handler
│   └── page.tsx                   # MODIFIED — mount <DebriefPanel/>
├── components/
│   └── DebriefPanel.tsx          # NEW — overlay + End-run button
├── lib/
│   ├── store.ts                   # MODIFIED — transcript[], debrief slot
│   └── verdict.ts                 # NEW — pure verdict thresholds (importable by route + tests)
└── hooks/
    └── useRealtimeVoice.ts       # MODIFIED — append to store.transcript on transcript.final / response.done
```

### Pattern 1: Next.js 16 App Router POST handler
**What:** A `route.ts` file inside `src/app/api/<name>/` exports `async function POST(request: Request)`.
**When to use:** Any frontend → backend RPC the browser can issue.
**Example:**
```ts
// Source: node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md L31-37
// src/app/api/debrief/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  // ... call LLM ...
  return Response.json({ verdict: 'solid', critique: '...' });
}
```

Notes from the docs:
- "Route Handlers are not cached by default" — POST is never cached, no `dynamic` directive needed.
- Use `Response.json(...)` — Web standard, no Next-specific imports required.
- No conflict with `src/app/page.tsx` because the route is at a different segment (`/api/debrief`).

### Pattern 2: DashScope non-streaming completion via OpenAI-compat SDK
**What:** Same client init as ws-server's `streamLlmResponse`, but `stream: false`.
**When to use:** Any single-shot completion (no token streaming, no TTS).
**Example:**
```ts
// Source: derived from ws-server/src/dashscope/llm.ts L9-12, L48-52
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
});

const completion = await client.chat.completions.create({
  model: 'qwen-plus',
  stream: false,
  messages: [
    { role: 'system', content: instructorSystemPrompt },
    { role: 'user', content: payloadSummary },
  ],
});
const critique = completion.choices[0]?.message?.content ?? '';
```

### Pattern 3: Zustand turn-by-turn append
**What:** Append each finalized voice turn into a store array, clear on R-reset.
**When to use:** Any per-turn capture for debrief / analytics.
**Example:**
```ts
// store.ts addition
type TurnLog = { role: 'user' | 'pilot'; text: string; ts: number };
interface SceneState {
  // ... existing ...
  transcript: TurnLog[];
  appendTurn: (t: TurnLog) => void;
  clearTranscript: () => void;
}

// useRealtimeVoice.ts — inside transcript.final case (L199-211):
useStore.getState().appendTurn({ role: 'user', text, ts: Date.now() });

// inside response.done case (L234-286), use the existing assistantBufferRef.current:
if (!isImmediate && buffered) {
  useStore.getState().appendTurn({ role: 'pilot', text: buffered, ts: Date.now() });
}
```

### Anti-Patterns to Avoid
- **LLM-emitted verdict:** Asking Qwen to choose `solid|needs_work|unsafe` invites hallucination — verdict and critique can disagree. Compute verdict server-side from `distanceToTarget` / `distanceToFriendlies` numbers; tell the LLM the verdict in the prompt and ask for prose that justifies it.
- **Streaming the debrief:** Adds wave-handling, partial-render UI complexity for zero demo lift. Phase requirement BRIEF-04 is explicit: non-streaming.
- **POSTing audio buffers to the route:** The route consumes only text + numbers. Keep audio entirely browser-side.
- **Reading the system prompt file from `src/app/api/debrief/route.ts`:** Inline the instructor prompt as a string constant in the route file. Reading from disk during a Vercel serverless invocation works but adds a second file to ship; for a 60-min hackathon phase the inline string is simpler.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Talk to DashScope | Raw `fetch` to dashscope endpoints | `openai` SDK with `baseURL` override | ws-server proves this pattern works with the same env var; copy verbatim |
| Verdict thresholds in three places | Hardcode in route + UI + smoke test | `src/lib/verdict.ts` — single function | One source of truth; easier to tweak demo |
| Build a transcript ring buffer / dedup | Custom logic | Trust ws-server's existing turn dedup (`MAX_HISTORY_ENTRIES = 20` in session.ts:17) and just append on `transcript.final` / `response.done` | Demo will produce ≤6 turns total |
| Auth on `/api/debrief` | Anything | Nothing | Out of scope per PROJECT.md "Auth, persistence, user accounts" |

**Key insight:** The hackathon punchline (`unsafe` verdict on Take B) needs the verdict to be **provably correct**. Putting verdict math in a 5-line pure function (`src/lib/verdict.ts`) lets the smoke test assert it deterministically without an LLM round-trip.

## Common Pitfalls

### Pitfall 1: `responseText` resets to `''` on `response.done`
**What goes wrong:** `useRealtimeVoice.ts` clears `responseText` after each turn (L255, L268) so by End-run time only the LAST pilot reply is in `status.responseText`. The DebriefPanel cannot just read `status.responseText` and `status.transcript` — those are single-utterance buffers, not history.
**Why it happens:** Phase 1 design — those fields back the live captions, not the debrief.
**How to avoid:** Snapshot finalized turns into `useStore.transcript[]` at `transcript.final` (line 199-211) and at `response.done` non-immediate branch (line 234-247). Use `assistantBufferRef.current` (line 236) BEFORE the `assistantBufferRef.current = ''` clear (line 237) — that's the buffered pilot text for the just-ended turn.
**Warning signs:** Debrief payload's `transcript` array has length ≤ 1 after a multi-turn run.

### Pitfall 2: ws-server strips `<grid>` tag — pilot transcript will NOT contain the grid digits as a tag
**What goes wrong:** The pilot text appended to `assistantResponse` in session.ts:151 is already tag-stripped — by design. So the debrief LLM sees Hawg 21 saying "five-niner-niner-seven-niner-niner" but no `<grid>599799</grid>`.
**Why it happens:** Phase 3 / PILOT-04 contract — tag goes only to the wire, never to text streams.
**How to avoid:** Pass `transmittedGrid` (from the store) **explicitly** in the payload alongside `correctGrid: '599699'`. Don't expect the LLM to extract it from prose.

### Pitfall 3: Reset (R-key) does NOT clear transcript today
**What goes wrong:** R-key (`JTACController.tsx`) clears `transmittedGrid + lasedRange + impactResult` only (per Phase 3 SUMMARY:30). After the user runs Take A, then R, then Take B, transcript would contain BOTH takes' turns concatenated → debrief is confused.
**Why it happens:** Reset semantics from Phase 3 didn't anticipate transcript field.
**How to avoid:** Add `clearTranscript()` to the R-key handler (one-line addition in `src/scene/JTACController.tsx`).
**Warning signs:** Take B debrief mentions Take A digits in the critique.

### Pitfall 4: `impactResult` may be `null` when user clicks End run
**What goes wrong:** If the user clicks End run before the bomb has impacted (or before they ever spoke), `impactResult === null` and the verdict math divides by undefined.
**How to avoid:** Disable the End run button until `impactResult !== null`, OR send `null` to the route and have the route return `{verdict: 'no_strike', critique: 'No ordnance released this run.'}` deterministically.

### Pitfall 5: DashScope `qwen-plus` non-streaming response shape
**What goes wrong:** ws-server only ever uses streaming (`stream: true`); the non-streaming code path is untested in this codebase.
**How to avoid:** OpenAI SDK contract is `completion.choices[0].message.content` for `stream: false`. [VERIFIED: standard openai SDK shape since v4; ws-server uses `chunk.choices[0]?.delta?.content` for streaming at llm.ts:64]. Add a defensive `?? ''` and graceful fallback critique on empty/error.

## Code Examples

Verified patterns from official sources / shipped repo:

### POST handler skeleton (Next 16)
```ts
// Source: node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md L31-37
// src/app/api/debrief/route.ts
import OpenAI from 'openai';
import { computeVerdict, type Verdict } from '@/lib/verdict';

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
});

const INSTRUCTOR_PROMPT = `You are a senior JTAC instructor debriefing a student after a CAS run.
Tone: clipped, professional, blunt. 3-5 sentences. Reference the verdict ({{VERDICT}}).
If verdict is 'unsafe', explicitly call out the friendlies proximity in meters.
If verdict is 'needs_work', name the miss distance to target.
If verdict is 'solid', acknowledge the hit and one thing to maintain next time.
Do NOT use bullet points. Do NOT mention you are an AI.`;

export async function POST(request: Request) {
  const body = await request.json() as {
    transcript: Array<{ role: 'user' | 'pilot'; text: string }>;
    impact: { distanceToTarget: number; distanceToFriendlies: number; grid: string } | null;
    correctGrid: string;
  };

  const verdict: Verdict = computeVerdict(body.impact);

  const userPayload = [
    `VERDICT: ${verdict}`,
    `TRANSMITTED GRID: ${body.impact?.grid ?? 'none'}`,
    `CORRECT GRID (lased): ${body.correctGrid}`,
    `IMPACT DISTANCE TO TARGET: ${body.impact?.distanceToTarget?.toFixed(1) ?? 'N/A'} m`,
    `IMPACT DISTANCE TO FRIENDLIES: ${body.impact?.distanceToFriendlies?.toFixed(1) ?? 'N/A'} m`,
    '',
    'TRANSCRIPT:',
    ...body.transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`),
  ].join('\n');

  try {
    const completion = await client.chat.completions.create({
      model: 'qwen-plus',
      stream: false,
      messages: [
        { role: 'system', content: INSTRUCTOR_PROMPT.replace('{{VERDICT}}', verdict) },
        { role: 'user', content: userPayload },
      ],
    });
    const critique = completion.choices[0]?.message?.content?.trim() ?? '(no critique generated)';
    return Response.json({ verdict, critique });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json(
      { verdict, critique: `Debrief generation failed: ${msg}. (Verdict computed from numbers.)` },
      { status: 200 } // never block the UI
    );
  }
}
```

### Verdict thresholds (single source of truth)
```ts
// src/lib/verdict.ts
import { TARGET_WORLD, FRIENDLIES_WORLD } from '@/lib/positions';

export type Verdict = 'solid' | 'needs_work' | 'unsafe' | 'no_strike';

// From .planning/phases/03-jtac-pilot-persona-grid-bridge/03-SCENARIO.md "Locked values appendix":
//   Verdict threshold (target hit):       impact within 30 m of BTR    → solid
//   Verdict threshold (friendlies safety): impact within 75 m of friendlies → unsafe
// (unsafe takes precedence over solid — friendlies safety dominates)
export const SOLID_TARGET_M = 30;
export const UNSAFE_FRIENDLIES_M = 75;

export function computeVerdict(
  impact: { distanceToTarget: number; distanceToFriendlies: number } | null
): Verdict {
  if (!impact) return 'no_strike';
  if (impact.distanceToFriendlies <= UNSAFE_FRIENDLIES_M) return 'unsafe';
  if (impact.distanceToTarget <= SOLID_TARGET_M) return 'solid';
  return 'needs_work';
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pages/api/*` route w/ `req`/`res` | `app/api/*/route.ts` w/ Web `Request`/`Response` | Next 13.4 → stable in 14+ | Use the App Router pattern; this repo is Next 16, App Router only |
| OpenAI SDK v3 `openai.createChatCompletion` | OpenAI SDK v4+ `client.chat.completions.create` | SDK v4 (Aug 2023) | ws-server already uses v6.32; same call shape works |

**Deprecated/outdated:**
- `pages/api/*.ts` Pages Router endpoints — NOT used in this repo (verified: no `src/pages/` directory exists).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DashScope intl gateway accepts `stream: false` on `qwen-plus` with the OpenAI-compat SDK | Pattern 2 / Pitfall 5 | If only streaming is supported, route falls back to consuming the stream and concatenating — adds 5 LOC. Low risk; OpenAI-compat is a standardized contract. |
| A2 | `openai` package version `^6.32.0` works in Next 16 server runtime | Standard Stack | Very low — package is pure ESM/CJS with no DOM deps; Vercel/Next.js serverless supports it. |
| A3 | `responseText` clear timing in useRealtimeVoice.ts L255 occurs AFTER the analytics post at L238-245, so `assistantBufferRef.current` is the right snapshot | Pattern 3 | Verified by reading L234-247 — buffered is captured, ref cleared, then posted. Safe to mirror this pattern. |

**Ratio:** 3 assumed / many verified. All assumptions are low-risk and easy to verify at implementation time with a single curl + smoke test.

## Open Questions

1. **Where in the HUD should "End run" sit?**
   - What we know: TalkButton is bottom-center; ScenarioCard top-right; DebugPanel bottom-left; Reticle center.
   - What's unclear: Top-left is the only unused HUD corner.
   - Recommendation: Top-left HUD corner button labeled `[ END RUN ]`, amber border to match HUD palette, becomes enabled only when `impactResult !== null`. Becomes label `[ NEW RUN ]` after debrief renders, and clicking it dismisses the panel + calls the same R-reset clears.

2. **Should the End run button reuse the R-key path or have its own clear?**
   - Recommendation: After debrief is dismissed, run the SAME clear path as R-key plus `clearTranscript()` and `setDebrief(null)`. Add a `useStore.endRun()` action that does all three.

3. **Pilot persona in critique — "Hawg 21" or a separate "instructor"?**
   - Recommendation: Separate persona ("senior JTAC instructor"). Hawg 21 is in-mission voice; the debrief is post-mission analysis. Different register, different speaker. Keeps the demo readable.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `DASHSCOPE_API_KEY` env var | `/api/debrief` LLM call | ✓ [VERIFIED: present in `/Users/kalebnim/Documents/GitHub/jtac-trainer/.env`] | `sk-689ad643...` | None — required |
| `openai` npm package (frontend) | `/api/debrief` route | ✗ — not in `package.json` | — | `bun add openai` (1 task action) |
| `playwright` | `debrief-smoke.ts` | ✓ | ^1.59.1 | — |
| Bun runtime | Everything | ✓ | (per project rules) | — |
| Next.js dev server on :3000 | UI + route handler | ✓ | 16.2.6 | — |
| ws-server on :8080 | Voice transcript flow (smoke can mock via dev hooks) | ✓ | running PID 35626 per Phase 3 SUMMARY | Smoke test bypasses via `__setTransmittedGrid` dev hook |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- `openai` in frontend — install in Task 1.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright + Bun runner (matches `bomb-smoke.ts` / `scene-smoke.ts` / `voice-smoke.ts` pattern) |
| Config file | none — top-level `*-smoke.ts` invoked with `bun <file>` |
| Quick run command | `bun debrief-smoke.ts` |
| Full suite command | `bun voice-smoke.ts && bun scene-smoke.ts && bun bomb-smoke.ts && bun debrief-smoke.ts` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRIEF-01 | Transcript captured turn-by-turn | unit (state-shape) inside smoke | inject store via dev hook + assert `transcript.length ≥ 1` | ❌ Wave 0 |
| BRIEF-02 | Outcome distances captured | covered by existing `bomb-smoke.ts` | `bun bomb-smoke.ts` | ✅ |
| BRIEF-03 | End-run POSTs to /api/debrief | integration (mock route response intercept in Playwright) | `bun debrief-smoke.ts` | ❌ Wave 0 |
| BRIEF-04 | Route returns `{verdict, critique}` | unit on `computeVerdict()` + integration POST | `bun -e "import {computeVerdict} from './src/lib/verdict.ts'; ..."` + smoke | ❌ Wave 0 |
| BRIEF-05 | DebriefPanel renders | DOM assertion in smoke | `bun debrief-smoke.ts` (assert `data-testid="debrief-verdict"`) | ❌ Wave 0 |
| BRIEF-06 | Bad-grid → unsafe verdict | end-to-end with Take B grid injection | `bun debrief-smoke.ts` Test 2 | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bunx tsc --noEmit && cd ws-server && bunx tsc --noEmit` (~3s) — type safety only
- **Per wave merge:** `bun debrief-smoke.ts` (~10s with Playwright headless)
- **Phase gate:** Full suite green before phase complete

### Wave 0 Gaps
- [ ] `debrief-smoke.ts` — covers BRIEF-01, BRIEF-03, BRIEF-04, BRIEF-05, BRIEF-06. Pattern: launch headless, click Connect (or skip via dev hook), inject `__setTransmittedGrid('599799')`, wait for `__getImpactResult() !== null`, click `[data-testid="end-run"]`, intercept POST `/api/debrief` (or let it actually call DashScope — recommend INTERCEPTING so smoke is offline-stable), assert `[data-testid="debrief-verdict"].textContent === 'unsafe'`.
- [ ] Mocked transcript injection: add a dev hook `window.__appendTurn(turn)` mirroring the pattern at `src/scene/BombImpact.tsx:171-188`.
- [ ] Pure-function test for `computeVerdict` — inline `bun -e` assertion in the verdict-module task.

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **Use `bun`/`bunx`, NOT `npm`/`npx`/`node`.** Frontend install: `bun add openai`. Smoke run: `bun debrief-smoke.ts`.
- **Next.js is NOT the version Claude knows.** Per AGENTS.md, consult `node_modules/next/dist/docs/`. Verified relevant doc: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` — confirms `route.ts` POST convention, Web `Request`/`Response` API, no caching of POST handlers, `Response.json(...)` for JSON output.
- **Playwright via `bunx playwright`** (not system Chrome). Existing smoke tests already follow this pattern.
- **No npm/Homebrew install attempts.**

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRIEF-01 | Transcript captured turn-by-turn during run | Pattern 3 (`appendTurn` from useRealtimeVoice transcript.final + response.done); Pitfall 1 (don't use status.responseText — it clears) |
| BRIEF-02 | Outcome captured: distance to target / friendlies | Already shipped by Phase 3 — `useStore.impactResult` populated by `BombImpact.tsx:115-125`. NO new code needed beyond reading from store. |
| BRIEF-03 | "End run" button POSTs transcript + outcome to `/api/debrief` | Pattern 1 (Next 16 POST handler); Open Question 1 (HUD position recommendation) |
| BRIEF-04 | `/api/debrief` calls DashScope LLM (non-streaming), returns `{verdict, critique}` | Pattern 2 (`stream: false` via openai SDK); Code Example (full route handler); Anti-pattern (don't let LLM choose verdict — server computes, LLM writes prose) |
| BRIEF-05 | DebriefPanel renders prose critique + verdict badge | Open Question 1 (overlay placement); style analog: `ScenarioCard.tsx` (amber border, font-mono, black/85 bg) and `TalkButton.tsx` (zinc button styling) |
| BRIEF-06 | Bad-grid run → "needs_work" or "unsafe" verdict referencing the miss | `verdict.ts` thresholds derived from SCENARIO.md locked values (75 m friendlies / 30 m target); critique payload includes `distanceToFriendlies` numerically so LLM can cite it; SCENARIO Take B math: impact at (99.6, 0, 300.3) → 19.7 m off friendlies → `unsafe` |

## Recommended Plan Structure

**One plan, four waves.** This phase has clean serial dependencies and the time budget (60 min) does not warrant splitting into multiple plans.

### Wave 1 — Store + transcript wiring (~15 min)
- T1.1: Extend `src/lib/store.ts` with `transcript: TurnLog[]`, `appendTurn`, `clearTranscript`, `debrief: {verdict, critique} | null`, `setDebrief`. Add `endRun()` action that calls all four clears.
- T1.2: Modify `src/hooks/useRealtimeVoice.ts` — append user turn at `transcript.final` (after L211), append pilot turn at `response.done` non-immediate branch (BEFORE L255 `setStatus({...responseText:''})` so `assistantBufferRef.current` snapshot uses `buffered` from L236).
- T1.3: Modify `src/scene/JTACController.tsx` R-key handler — add `clearTranscript()` and `setDebrief(null)` to the existing reset.
- T1.4: Add `src/lib/verdict.ts` with `computeVerdict()` + thresholds + inline `bun -e` test asserting `unsafe` for `{dToFriendlies: 19.7, dToTarget: 100.3}` and `solid` for `{dToFriendlies: 120, dToTarget: 0.4}`.

### Wave 2 — `/api/debrief` route (~15 min)
- T2.1: `bun add openai` in frontend root.
- T2.2: Create `src/app/api/debrief/route.ts` per Code Example. Inline INSTRUCTOR_PROMPT constant.
- T2.3: Manual curl smoke: `curl -X POST http://localhost:3000/api/debrief -H 'content-type: application/json' -d '{"transcript":[],"impact":{"distanceToTarget":100,"distanceToFriendlies":20,"grid":"599799"},"correctGrid":"599699"}'` — assert `verdict === 'unsafe'`, critique non-empty.

### Wave 3 — DebriefPanel + End-run button (~20 min)
- T3.1: Create `src/components/DebriefPanel.tsx` — modal-ish overlay (centered, `bg-black/90 border border-amber-700`, font-mono). Subscribes to `useStore.debrief`. Renders verdict badge (color-coded: solid=green, needs_work=amber, unsafe=red, no_strike=zinc) + critique paragraph + a "[ NEW RUN ]" close button that calls `endRun()`.
- T3.2: Add `[ END RUN ]` button to HUD (top-left). Disabled until `impactResult !== null`. On click: build payload from store, POST `/api/debrief`, on response call `setDebrief({verdict, critique})`. Show "ANALYZING..." while in flight.
- T3.3: Mount `<DebriefPanel />` in `src/app/page.tsx` after `<DebugPanel />`.
- T3.4: Add dev hook `window.__appendTurn` and `window.__triggerEndRun` mirroring BombImpact pattern, gated on `NODE_ENV !== 'production'`.

### Wave 4 — Smoke test (~10 min)
- T4.1: Create `debrief-smoke.ts` mirroring `bomb-smoke.ts` structure. Two tests:
  - **Test A (solid path):** inject `599699` via `__setTransmittedGrid`, wait for impact, intercept `/api/debrief` and stub response with `{verdict: 'solid', critique: 'Direct hit. Maintain that ROE next time.'}`, click End run, assert badge text contains "solid".
  - **Test B (unsafe path):** inject `599799`, wait, stub `{verdict: 'unsafe', critique: '...'}`, click End run, assert badge text contains "unsafe" AND critique paragraph mentions "19" or "friendlies".
- T4.2: Update Phase 4 SUMMARY when complete.

**Why one plan, not two:** All four waves touch different files (store / route / component / test) and chain serially. Splitting would force a hand-off doc between two plans for no time saved. The 60-min budget comfortably covers all four waves with the existing infra.

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` — Next 16 route handler convention (verified L31-37 POST signature, L43 supported HTTP methods, L51 caching default)
- `ws-server/src/dashscope/llm.ts` L9-12, L26-91 — DashScope OpenAI-compat client setup, `qwen-plus` model name, baseURL
- `ws-server/src/session.ts` L62-228 — proven streaming pipeline + tag-strip semantics (informs why pilot transcript text is already clean of `<grid>` tags)
- `src/hooks/useRealtimeVoice.ts` L178-318 — `handleMessage` switch, transcript/response.done lifecycle, analytics POST pattern
- `src/lib/store.ts` L1-37 — current state shape including `ImpactResult` type already populated
- `src/scene/BombImpact.tsx` L115-125, L171-188 — distance writes + dev-hook pattern to mirror
- `.planning/phases/03-jtac-pilot-persona-grid-bridge/03-SCENARIO.md` "Locked values appendix" — verdict thresholds (30 m solid, 75 m unsafe), Take B impact distances (100.3 m / 19.7 m)
- `package.json` + `ws-server/package.json` — version pins
- `.env` files — `DASHSCOPE_API_KEY` confirmed present

### Secondary (MEDIUM confidence)
- OpenAI SDK `chat.completions.create` non-streaming response shape — standard since SDK v4 [VERIFIED indirectly via openai/openai-node README convention; not refetched in this session]

### Tertiary (LOW confidence)
- None — all critical claims are sourced from shipped repo files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library already in `package.json` or `ws-server/package.json` and exercised in shipped code
- Architecture: HIGH — every upstream contract (transcript flow, impact distances, env var) verified by reading shipped code
- Pitfalls: HIGH — derived from reading the actual `useRealtimeVoice.ts` clear-on-done timing and Phase 3 R-key scope

**Research date:** 2026-05-09
**Valid until:** 2026-05-09 + 7 days (hackathon code; ws-server contract may evolve)
