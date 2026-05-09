# Phase 7: End-of-training evaluation, phraseology, and scored explanation - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning
**Source:** /gsd-discuss-phase

<domain>
## Phase Boundary

Replace Phase 4's prose-only debrief with a **structured evaluation panel** shown when the trainee clicks "End Run":

- Numeric overall score (0–100)
- Three sub-scores: Phraseology, Grid Accuracy, Safety
- "Did Well" / "Needs Work" bullet lists explaining the score

Scored by a single LLM call to a new `/api/evaluate` route. The existing `/api/debrief` route stays in the repo but becomes dead code at runtime.

In scope: scoring rubric, evaluator prompt, `/api/evaluate` route, replacing the critique block inside `DebriefPanel` with the new evaluation block, wiring `EndRunButton` to call evaluate instead of debrief.

Out of scope: per-line 9-line parsing, real MGRS math, multiple scenarios, persistence of past scores, leaderboard.

</domain>

<decisions>
## Implementation Decisions

### Score Format & Rubric
- **Overall score:** numeric 0–100.
- **Sub-scores:** three dimensions, each 0–100:
  - **Phraseology** — 9-line format adherence + comms discipline (callsigns, brevity)
  - **Grid Accuracy** — derived from impact-to-target distance (already computed in Phase 4 outcome capture)
  - **Safety** — derived from impact-to-friendlies distance (already computed in Phase 4 outcome capture)
- **Brevity / Comms Tempo** is NOT a separate dimension — folded into Phraseology.
- **Verdict badge** (Phase 4's solid/needs_work/unsafe) is replaced by the numeric scores; do not carry it forward into the new panel.

### Phraseology Evaluation Approach
- **Loose LLM-judged vibes.** Prompt the evaluator with a description of correct 9-line CAS phraseology (line order, callsign discipline, brevity) and let it score 0–100.
- No regex/keyword detection of individual lines.
- No hard requirement that all 9 lines be present — partial briefs still get scored.

### Explanation Shape
- **Two bullet lists:** "Did Well" and "Needs Work".
- 2–4 bullets each, terse, instructor voice.
- No long prose paragraph (Phase 4's `critique` field is dropped from the UI).
- No per-dimension explanation breakdown — bullets can reference any dimension freely.

### UI Placement
- **Replace the critique block inside `DebriefPanel`** with the new evaluation block.
- Layout (top to bottom): overall score → three sub-scores → Did Well bullets → Needs Work bullets.
- DebriefPanel itself stays (same mount point, same open/close behavior). Only its body changes.

### Backend Approach
- **New route:** `src/app/api/evaluate/route.ts`.
- Single non-streaming DashScope LLM call. One prompt, one structured JSON response.
- Response shape:
  ```ts
  {
    scores: { overall: number; phraseology: number; gridAccuracy: number; safety: number };
    didWell: string[];
    needsWork: string[];
  }
  ```
- Input shape: same as Phase 4's `/api/debrief` payload (transcript turns + outcome with target/friendlies distances).
- Existing `/api/debrief` route is left untouched in the repo but no longer called.

### End-Run Wiring
- `EndRunButton` calls `/api/evaluate` only. `/api/debrief` is not called.
- Loading state, error state: same patterns as Phase 4's debrief flow.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing implementation to mirror / replace
- `src/app/api/debrief/route.ts` — Phase 4 LLM-call pattern (DashScope non-streaming, prompt construction). The new `/api/evaluate` route should mirror this shape.
- `src/components/DebriefPanel.tsx` — current panel; body is being swapped.
- `src/components/EndRunButton.tsx` — fetch wiring point; needs to call `/api/evaluate`.
- `src/lib/store.ts` — where transcript + outcome (impact-to-target, impact-to-friendlies distances) are held.

### Phase context
- `.planning/PROJECT.md` — overall hackathon constraints and core value.
- `.planning/REQUIREMENTS.md` — BRIEF-01..BRIEF-06 are the Phase 4 baseline this phase extends.
- `prompts/system-prompt.md` — pilot persona ("hog1") and the JTAC callsign ("romeo2"); the evaluator prompt should know these so it can recognize callsign discipline.

</canonical_refs>

<specifics>
## Specific Ideas

- The evaluator must accept a partial/messy transcript without crashing — ASR noise is normal.
- The bullets should sound like an instructor, not a chatbot. Reuse the voice from `/api/debrief`'s prompt as a starting point if useful.
- Phase 4's verdict ladder (solid/needs_work/unsafe) is a reasonable mental model for what "good" looks like at 80+/60–80/<60 — but do NOT expose the verdict label in the new UI; numbers only.

</specifics>

<deferred>
## Deferred Ideas

- Per-line 9-line parsing with regex detection of each line label
- Persisting past run scores / leaderboard
- Per-dimension expandable explanations
- Brevity / Comms Tempo as its own scored dimension
- Real-time per-line scoring during the run

</deferred>

---

*Phase: 07-add-end-of-training-evaluation-trainee-phraseology-and-a-ove*
*Context gathered: 2026-05-09 via /gsd-discuss-phase*
