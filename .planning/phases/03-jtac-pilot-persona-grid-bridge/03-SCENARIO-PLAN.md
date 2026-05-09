---
quick_id: 260509-fox
slug: demo-scenario
inserted_into_phase: 03-jtac-pilot-persona-grid-bridge
inserted_on: 2026-05-09
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/260509-fox-demo-scenario/SCENARIO.md
autonomous: true
requirements:
  - SCENE-01
  - SCENE-02
  - SCENE-03
  - SCENE-04
  - SCENE-05
  - PILOT-01
  - PILOT-02
  - PILOT-03
  - PILOT-04
  - PILOT-05
  - PILOT-06
  - BRIEF-01
  - BRIEF-02
  - BRIEF-03
  - BRIEF-04

must_haves:
  truths:
    - "A reader of SCENARIO.md can place the hill, BTR, and friendlies without inventing coordinates"
    - "The two-take demo script is verbatim — both MGRS values and which digit gets misread are spelled out"
    - "Wrong-grid miss in Take B lands close enough to friendlies to read as 'unsafe' on the debrief"
    - "Live MGRS continues updating after lase; lase only adds the persistent range readout"
    - "Reset is single-keybind and clears bomb/range/transcript without reloading the page"
    - "Each scenario element references the Phase 2 / Phase 3 / Phase 4 success criterion it serves"
  artifacts:
    - path: ".planning/quick/260509-fox-demo-scenario/SCENARIO.md"
      provides: "Single source of truth for the demo scenario consumed by Phase 3 wiring"
      contains: "scene description, asset list, prop coordinates, rangefinder spec, 9-line text, two-take script, reset spec, cross-phase mapping"
  key_links:
    - from: "SCENARIO.md prop coordinates"
      to: "Phase 2 scene component (existing 1000m ground plane, ~150–400m slant range)"
      via: "Three.js world units (1 unit = 1 meter), camera vantage above hill"
    - from: "SCENARIO.md 9-line line 4 (MGRS) + line 5 (range)"
      to: "Phase 3 PILOT-04 (<grid> tag emission) + bomb impact at gridToWorld(grid)"
      via: "Verbatim spoken brief drives ASR → LLM → <grid> readback"
    - from: "SCENARIO.md Take B misread digit"
      to: "Phase 4 BRIEF-04 'unsafe' verdict (impact-to-friendlies distance)"
      via: "Off-target impact within friendlies billboard radius triggers verdict"
---

<phase_3_insertion_note>
This plan now lives inside Phase 3's planning bundle (alongside `03-CONTEXT.md` and `03-SCENARIO-CONTEXT.md`). When executed:

1. **Reconcile coordinates to shipped Phase 2 values** — see banner in `03-SCENARIO-CONTEXT.md`. BTR is at `TARGET_WORLD = (100, 1, 200)`; friendlies at `FRIENDLIES_WORLD = (100, 2, 1000)`. Recompute camera vantage, slant range, and the canonical/misread MGRS pair against `worldToGrid` output. Do NOT use the `(-15, 0, 0)` / `(60, 1.5, 30)` values literally — they were Claude's Discretion picks made before reading the existing scene.
2. **Output path may move** — current spec writes to `.planning/quick/260509-fox-demo-scenario/SCENARIO.md`. If you want the artifact to live with Phase 3, also write a copy (or move) to `.planning/phases/03-jtac-pilot-persona-grid-bridge/03-SCENARIO.md`.
3. **Locked vs discretionary** — the locked decisions are: (a) two-take wrong-grid punchline as the demo arc, (b) live MGRS continues + lase locks range. Everything else is open for executor judgment, including the digit-misread position once geometry is reconciled.
</phase_3_insertion_note>

<objective>
Produce a single SCENARIO.md design document that locks every concrete value Phase 3 (and any Phase 2 follow-up nudges or Phase 4 outcome capture) needs to wire the BTR-on-a-hill demo end-to-end.

Purpose: Eliminate ambiguity for the executor — coordinates, keybinds, exact MGRS strings, exact 9-line text, exact misread digit, exact reset behavior. The "wrong voice = visible miss" punchline only lands if Take A and Take B are pre-choreographed; this doc choreographs them.

Output: `.planning/quick/260509-fox-demo-scenario/SCENARIO.md` — design artifact only. No code changes. No new dependencies.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/quick/260509-fox-demo-scenario/260509-fox-CONTEXT.md
@AGENTS.md
@CLAUDE.md

<!-- Existing scene baseline that SCENARIO.md must align with (do not contradict): -->
<!-- Phase 2 shipped: 1000m square ground plane; faked 6-digit grid via camera-raycast; -->
<!-- reticle HUD with live grid; mouse-look only (fixed observation post); raycast throttled ~10 Hz. -->

<interfaces>
<!-- Conventions the SCENARIO.md must respect — extracted from PROJECT.md / ROADMAP.md / STATE.md -->

World units & grid:
- Three.js world units = meters. Ground plane is 1000m × 1000m (Phase 2 SCENE-03).
- 6-digit faked MGRS derived from camera-raycast hit on the ground plane (Phase 2 SCENE-02).
- `worldToGrid(vec3) -> "NNNNNN"` and `gridToWorld("NNNNNN") -> vec3` round-trip (Phase 2 SCENE-03).

Pilot/grid bridge contract (Phase 3):
- LLM emits `<grid>NNNNNN</grid>` in stream; ws-server strips tag, emits `grid.transmitted` event.
- Frontend `BombImpact` falls at `gridToWorld(transmittedGrid)` — NOT at the lased grid. The whole point.

Debrief contract (Phase 4):
- Outcome capture records `distanceToTarget` and `distanceToFriendlies` of the impact point.
- Verdict thresholds (suggested in SCENARIO.md, but final values owned by Phase 4): impact within ~30m of target = on-target; impact within ~75m of friendlies = "unsafe".
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Author SCENARIO.md with all eight required sections</name>
  <files>.planning/quick/260509-fox-demo-scenario/SCENARIO.md</files>
  <action>
Create `.planning/quick/260509-fox-demo-scenario/SCENARIO.md` as a single design document. Use the following structure verbatim — every section is required, every numbered value must be concrete (no "TBD", no ranges where a single number suffices).

Frontmatter:
```yaml
---
quick_id: 260509-fox
slug: demo-scenario
artifact: SCENARIO
status: locked
authored: 2026-05-09
consumers: [phase-3, phase-4]
---
```

Sections (in order):

### 1. Scene description (one paragraph)
What the user sees on page load: FPS camera at the top of a low ridge, looking south-southwest down a shallow slope. Mid-foreground: a single BTR-80 hull stationary on a dirt patch. Mid-distance to the BTR's east-northeast: a small cluster of three friendlies marked by a NATO-blue billboard tagged "FRIENDLY POS". Reticle centered, amber crosshair, live MGRS string in HUD top-right. No menus, no scenario picker. State explicitly that mouse-look + L-key (lase) + R-key (reset) are the only inputs.

### 2. Asset list
Markdown table with columns: Asset | Type | Source/Fallback | Notes. Rows must include:
- Terrain hill — primitive `PlaneGeometry` 1000×1000 with vertex displacement OR a single low-poly heightmap GLB if findable in <10 min; fallback = displaced plane with 3–5 noise octaves baked into vertices.
- BTR-80 target — free GLB candidates (note: search Sketchfab/Poly Haven/Quaternius for "BTR" or "APC" CC0); fallback = composite primitive (one elongated `BoxGeometry` hull 6.7m × 2.9m × 2.4m + 8 small cylinders for wheels, dark olive material).
- Friendlies billboard — `PlaneGeometry` 4m × 3m, double-sided, NATO-blue (`#1E4D8C`) with white "FRIENDLY POS" text texture; faces camera (Phase 2 SCENE-04 already in scope).
- Reticle/HUD overlay — DOM overlay (already shipped in Phase 2 SCENE-02). Extend with range readout slot.
- Bomb impact effect — falling sphere → ring + smoke (Phase 3 PILOT-05; not designed here, just referenced).

For each row, sourcing notes must call out the 90-min Phase 2 budget already burned and recommend primitive fallbacks first if Phase 2 ships are already locked.

### 3. Prop placement (concrete coordinates)
Markdown table: Prop | Position (x, y, z) | Rotation (deg) | Notes. World origin at ground-plane center, +X east, +Z south, +Y up. Use these exact values:

- Camera (player) — position `(0, 35, 250)`, looking at `(0, 0, 0)` (yaw 180°, pitch -8°). Hill apex baked into terrain at this xz; eye height +1.7m above apex.
- BTR-80 — position `(-15, 0, 0)`, rotation y=110° (broadside-ish to camera).
- Friendlies billboard — position `(60, 1.5, 30)`, billboarded to camera. East-northeast of BTR.
- Ground plane — `(0, 0, 0)`, 1000×1000 (already shipped).

Slant range from camera to BTR: `sqrt(15² + 35² + 250²) ≈ 252.6 m`. Round to **253 m** for the demo readout. Distance from BTR to friendlies: `sqrt(75² + 30²) ≈ 80.8 m` — note this is the safety-critical metric for Take B verdict.

Include a small ASCII top-down sketch:
```
         N
         ↑
   F (friendlies)
   ·
       ·  BTR
                    ← camera/hill
         (player looks south)
```

### 4. Rangefinder UX spec
- **Keybind:** hold `L` (or right-mouse-button — pick L; document RMB as alt). Single-tap on press; no menu.
- **Visual feedback on lase:**
  1. 80ms full-screen amber flash at 6% opacity (subtle).
  2. Reticle inner crosshair pulses to 1.4× scale for 200ms then settles.
  3. HUD top-right gains a second line: `RNG  0253 m` (zero-padded to 4 digits, monospace, amber). Persists until next lase or reset.
- **Audible feedback:** single 1200Hz square-wave "ping" 60ms duration via WebAudio — no asset file needed. Mute if `audioCtx` not yet unlocked.
- **HUD layout (text-only spec, top-right corner, anchored 16px from edges):**
  ```
  GRID  EAST123 NORTH456    ← live, updates ~10Hz with crosshair
  RNG   0253 m              ← appears only after first lase, persists
  ```
  Live MGRS line keeps updating after lase (per CONTEXT decision). Lase locks the range readout, not the grid.
- **Range computed as:** straight-line distance from camera position to raycast hit point (not horizontal distance). One-shot; no continuous tracking.

### 5. 9-line brief card content (verbatim prefilled text)
Render as a faux-paper card overlay, bottom-left. Lines 1–9 below — bracket placeholders mark "live" lines that the user must speak using current HUD readouts (these are the lines pilot reads back).

```
1. IP:               COWBOY
2. Heading:          180°
3. Distance from IP: 4.2 km
4. Target elevation: [TGT_GRID]   ← LIVE: read MGRS off HUD
5. Target description: BTR-80 armored personnel carrier
6. Target location:  [TGT_GRID]   ← LIVE: same MGRS, this is the line pilot reads back as <grid>
7. Mark type:        LASER
8. Friendlies:       NORTHEAST 80 METERS, MARKED BLUE PANEL
9. Egress:           SOUTH
```

Notes for executor:
- Lines 4 and 6 BOTH carry the MGRS in real CAS doctrine; for the demo, only line 6 needs to flow into `<grid>` (Phase 3 PILOT-03 already specifies line 6). Listing line 4 keeps the card looking right.
- The bracket `[TGT_GRID]` text is what's printed on the card — the user reads the live HUD value aloud; we do not auto-substitute.

### 6. Two-take demo script (verbatim, 60–90s each)
Pre-pick a deterministic MGRS for the BTR location so both takes use the same target string. Use **`345678`** as the canonical correct MGRS for `(-15, 0, 0)` (Phase 3 should hardcode this in the gridToWorld test fixture so the demo is reproducible — note this requirement explicitly in the script).

**Take A — Correct (target):**
> "Hawg 21, this is Fox 32, 9-line follows.
> Line 1: COWBOY.
> Line 2: heading one-eight-zero.
> Line 3: four point two kilometers.
> Line 4: target grid **three-four-five-six-seven-eight**.
> Line 5: BTR-80, dug in, broadside.
> Line 6: target location grid **three-four-five-six-seven-eight**.
> Line 7: laser.
> Line 8: friendlies northeast eight-zero meters, marked blue panel.
> Line 9: egress south.
> How copy?"

Expected pilot readback (Phase 3 PILOT-03): "Fox 32, Hawg 21, copy target grid three-four-five-six-seven-eight, BTR-80, friendlies northeast eight-zero, cleared hot. `<grid>345678</grid>`"

Expected outcome: bomb falls at `gridToWorld("345678") ≈ (-15, 0, 0)`, hits BTR. Phase 4 verdict: `solid`.

**Take B — Misread (miss near friendlies):**
After R-key reset, lase the same BTR. HUD shows the same `345678`. User deliberately misreads **the 4th digit (`6` → `9`)** on line 6 only:
> "Hawg 21, Fox 32, 9-line follows.
> Line 1: COWBOY.
> Line 2: heading one-eight-zero.
> Line 3: four point two kilometers.
> Line 4: target grid three-four-five-six-seven-eight.
> Line 5: BTR-80, dug in, broadside.
> Line 6: target location grid **three-four-five-NINE-seven-eight**.
> Line 7: laser.
> Line 8: friendlies northeast eight-zero meters, marked blue panel.
> Line 9: egress south.
> How copy?"

Expected pilot readback: pilot reads back **what the pilot heard on line 6** (per Phase 3 prompt — pilot must echo line 6, not "correct" it). `<grid>345978</grid>`.

Why this digit: position 4 in the faked-MGRS encoding shifts the impact in the +Z direction (north) by ~30m × digit-delta in our 1000m plane. A `6→9` shift at position 4 lands the bomb roughly at `(-15, 0, +30)` — within the 80m friendlies radius — visibly close to the blue billboard, far enough off the BTR to read as "miss". Executor must verify exact offset against the actual `gridToWorld` implementation; if the offset isn't ~30–60m, escalate which digit-position to misread (try position 5 or 6 instead). Document in SCENARIO.md as: "If digit-4 misread doesn't land within 30–80m of friendlies, fall back to misreading digit-5; do NOT misread digit-6 (too small a delta, may still hit BTR)."

Expected Phase 4 verdict: `unsafe` — citing impact within 80m of friendlies.

Total airtime budget per take: 60–75s spoken + ~10s pilot readback + ~5s bomb fall = ~90s. Two takes + reset = ~3 min, fits inside the <2 min single-loop target with one buffer pass.

### 7. Reset mechanism
- **Keybind:** `R` (single tap; not held).
- **What resets:**
  - Bomb impact effects despawned (sphere, ring, smoke meshes removed).
  - Locked range readout cleared from HUD (line disappears; live MGRS line keeps running).
  - Voice transcript log cleared in DebugPanel.
  - Pilot session: send `session.reset` event to ws-server (re-uses Phase 1 contract; if ws-server doesn't implement it, frontend simply drops the existing WebSocket and opens a new one — Phase 3 to confirm cheaper path).
- **What persists:**
  - Camera pose (player keeps looking at the BTR — no re-aiming penalty).
  - Scene/assets (no reload).
  - Audio context unlock state (don't make user re-grant mic).
- **Time budget:** R-press to "ready for Take B" must be <2s (CONTEXT requirement). If ws-server reconnect costs >1s, prefer in-session `session.reset` and own the one-line ws-server edit in Phase 3.

### 8. Cross-phase integration notes
Markdown table: Scenario element | Phase | Requirement ID | How it's satisfied. Required rows:
- Live MGRS HUD → Phase 2 / SCENE-02 (already shipped)
- Reticle + crosshair → Phase 2 / SCENE-02 (already shipped; range readout slot is a SCENE-02 follow-up nudge — flag as "small extension, not new task")
- BTR + friendlies placement → Phase 2 / SCENE-04 (already shipped; this doc locks the coordinates)
- Rangefinder L-key + ping + RNG readout → **NEW** small frontend addition; flag for Phase 3 plan to absorb (5–10 min) — does not warrant a new phase
- 9-line card overlay → Phase 2 / SCENE-05 (talk button + scenario card overlay) — this doc supplies the verbatim text
- `<grid>NNNNNN</grid>` extraction → Phase 3 / PILOT-02 (ws-server one-line edit)
- BombImpact at gridToWorld → Phase 3 / PILOT-05
- Misread → off-target impact → Phase 3 / PILOT-06 (the "demonstrably wrong grid misses" criterion — this scenario is the demonstration)
- Distance-to-friendlies capture → Phase 4 / BRIEF-01
- "unsafe" verdict from Take B → Phase 4 / BRIEF-04
- Reset keybind → Phase 3 / PILOT-06 (or Phase 5 polish if cut)

End the document with a "Locked values" appendix that lists the demo's hardcoded constants in one place: canonical MGRS `345678`, misread digit position 4 (`6→9`), camera pos `(0,35,250)`, BTR pos `(-15,0,0)`, friendlies pos `(60,1.5,30)`, slant range `253m`, friendlies-safety threshold `75m`.

Do not include code blocks beyond the ASCII sketch and the 9-line card. Keep total length 400–700 lines.
  </action>
  <verify>
    <automated>test -f .planning/quick/260509-fox-demo-scenario/SCENARIO.md && grep -q '^## 1\. Scene description' .planning/quick/260509-fox-demo-scenario/SCENARIO.md && grep -q '^## 2\. Asset list' .planning/quick/260509-fox-demo-scenario/SCENARIO.md && grep -q '^## 3\. Prop placement' .planning/quick/260509-fox-demo-scenario/SCENARIO.md && grep -q '^## 4\. Rangefinder UX spec' .planning/quick/260509-fox-demo-scenario/SCENARIO.md && grep -q '^## 5\. 9-line brief card' .planning/quick/260509-fox-demo-scenario/SCENARIO.md && grep -q '^## 6\. Two-take demo script' .planning/quick/260509-fox-demo-scenario/SCENARIO.md && grep -q '^## 7\. Reset mechanism' .planning/quick/260509-fox-demo-scenario/SCENARIO.md && grep -q '^## 8\. Cross-phase integration' .planning/quick/260509-fox-demo-scenario/SCENARIO.md && grep -q '345678' .planning/quick/260509-fox-demo-scenario/SCENARIO.md && grep -q '345978' .planning/quick/260509-fox-demo-scenario/SCENARIO.md</automated>
  </verify>
  <done>
    SCENARIO.md exists with all 8 numbered sections, contains both the canonical MGRS `345678` and the misread `345978`, camera/BTR/friendlies coordinates are concrete numbers, two-take script is verbatim, reset mechanism is single-keybind, and cross-phase mapping cites Phase 2/3/4 requirement IDs.
  </done>
</task>

</tasks>

<verification>
- File exists at `.planning/quick/260509-fox-demo-scenario/SCENARIO.md`
- All 8 required sections present (grep gates above)
- Coordinates form a self-consistent geometry (camera → BTR slant ~253m; BTR → friendlies ~80m)
- Take A MGRS (`345678`) and Take B MGRS (`345978`) differ by exactly one digit at position 4
- No code changes, no dependency additions, no file modifications outside the quick task directory
</verification>

<success_criteria>
A Phase 3 executor opening SCENARIO.md can:
1. Hardcode `gridToWorld("345678") = (-15, 0, 0)` test fixture without guessing
2. Implement the L-key rangefinder against the exact HUD layout spec
3. Run the two-take script verbatim with no improvisation
4. Trust that Take B will produce an "unsafe" verdict because the impact-vs-friendlies geometry is pre-validated
</success_criteria>

<output>
After completion, create `.planning/quick/260509-fox-demo-scenario/260509-fox-SUMMARY.md` summarizing:
- Locked constants (MGRS, coordinates, keybinds)
- Open risks (digit-position fallback, ws-server `session.reset` cost)
- Pointers for Phase 3 executor
</output>
