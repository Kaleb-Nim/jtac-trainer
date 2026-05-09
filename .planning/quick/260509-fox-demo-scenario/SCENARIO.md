---
quick_id: 260509-fox
slug: demo-scenario
artifact: SCENARIO
status: locked
authored: 2026-05-09
consumers: [phase-3, phase-4]
reconciled_against:
  - src/scene/Target.tsx (TARGET_WORLD = (100, 1, 200))
  - src/scene/Friendlies.tsx (FRIENDLIES_WORLD = (100, 2, 1000) — flagged)
  - src/scene/JTACController.tsx (camera (0, 30, 80), lookAt (0,0,0))
  - src/scene/Terrain.tsx (1000×1000 PlaneGeometry centered at origin)
  - src/lib/grid.ts (worldToGrid: X,Z ∈ [-500, 500] → 6-digit, SCALE 0.999)
locked_constants:
  canonical_mgrs: "599699"
  misread_mgrs:   "599799"
  misread_digit_position: 4
  misread_change: "6 → 7"
  camera_pos: [0, 30, 80]
  camera_lookat_recommended: [100, 1, 200]
  btr_pos: [100, 1, 200]
  friendlies_pos_current: [100, 2, 1000]
  friendlies_pos_recommended: [100, 2, 320]
  slant_range_to_btr_m: 159
  friendlies_safety_threshold_m: 75
---

# Fox Demo Scenario — BTR-on-the-hill, two-take 9-line

> **Reconciliation banner.** This document was authored after reading the shipped Phase 2 source under `src/scene/*` and `src/lib/grid.ts`. Several values in the original `03-SCENARIO-PLAN.md` body (`(-15,0,0)` BTR, `(60,1.5,30)` friendlies, `0,35,250` camera, canonical MGRS `345678`) were Claude's-Discretion picks made before the scene was inspected. The locked DECISIONS — (a) two-take wrong-grid punchline, (b) live MGRS continues + lase locks range — are honored verbatim. The geometry below is the reconciled-to-shipped version. **Phase 3 must adopt the recommended friendlies relocation `(100, 2, 320)` and recommended camera initial `lookAt(100, 1, 200)`** for the demo to land — see §3 and §6 fallback notes.

---

## 1. Scene description

On page load the user is dropped into a fixed-position FPS camera 30 m above the centre of the ground plane, eye-line angled down toward the south-east. A single BTR-80 hull sits ~159 m away on the open plane, slightly off the right of the initial gaze line; behind/past it (further south) a NATO-blue billboard tagged **"FRIENDLY POS"** marks a three-man dismount cluster. The reticle is a thin amber crosshair dead-centre; the HUD top-right shows a live 6-digit MGRS string that updates as the user mouse-looks across the terrain. There are no menus, no scenario picker, no inventory. The only inputs are mouse-look (PointerLockControls — already shipped), **`L`** to lase, and **`R`** to reset.

The camera vantage is intentionally low and flat so the BTR reads as a silhouette against the ground — close enough (~159 m) to make out the boxy hull, far enough that a one-digit MGRS slip moves the impact point a visible distance across the plane.

---

## 2. Asset list

| Asset | Type | Source / Fallback | Notes |
|---|---|---|---|
| Ground plane (1000×1000 m) | `PlaneGeometry(1000, 1000, 1, 1)` rotated -π/2 | **Already shipped** in `src/scene/Terrain.tsx` | Flat green; no displacement. The "hill" of the demo is purely camera-elevation (`y=30`) — there is no actual terrain relief. Acceptable for hackathon; do NOT spend Phase 2 budget adding heightmaps. |
| BTR-80 target | Primitive `BoxGeometry(3, 2, 5)` red | **Already shipped** in `src/scene/Target.tsx` (`#c0392b`) | Reads as "vehicle silhouette" at 159 m. GLB swap deferred to Phase 5 per existing TODO comment. **Do not change material/scale** — the demo is calibrated to current footprint. |
| Friendlies billboard | `<Billboard>` + `octahedronGeometry(2)` blue (`#3498db`) | **Already shipped** in `src/scene/Friendlies.tsx` at `(100, 2, 1000)` | **PROBLEM (see §3):** current position is OUTSIDE the 1000×1000 plane on the +Z side and 800 m from the BTR — geometry cannot produce an "unsafe" verdict from a single-digit misread. **Phase 3 nudge required:** relocate to `(100, 2, 320)`. Optional polish: replace octahedron with `PlaneGeometry(4, 3)` + blue text texture, but keep the position fix as the priority. |
| Reticle / HUD | DOM overlay | **Already shipped** in `src/components/Reticle.tsx` (live MGRS) | Phase 3 small extension: add a second HUD line slot for `RNG  XXXX m`. ~10 line addition; not a new task. |
| Bomb impact effect | falling sphere → ring + smoke | Phase 3 / PILOT-05 (not in this doc) | Referenced only — design owned by Phase 3. |
| Ping SFX | WebAudio 1200 Hz square ~60 ms | Generated at runtime, no asset | Mute if `audioCtx` not yet unlocked. |

**Sourcing discipline:** the entire 90-min Phase 2 budget is already spent. Do NOT introduce GLB downloads, heightmaps, or texture work for this demo — every asset above except the friendlies relocation and the `RNG` HUD slot is already on disk.

---

## 3. Prop placement (concrete coordinates)

World convention (matches `src/lib/grid.ts`): origin at ground-plane centre. **+X is east, +Z is south, +Y is up.** Ground plane spans `X ∈ [-500, 500]`, `Z ∈ [-500, 500]`. `worldToGrid(x, z)` returns `EEENNN` where `EEE = round((x + 500) * 0.999)` and `NNN = round((z + 500) * 0.999)`.

| Prop | Position (x, y, z) | Rotation | Status | Notes |
|---|---|---|---|---|
| Camera (player) | `(0, 30, 80)` | `lookAt(100, 1, 200)` ← **recommended; ships as `lookAt(0,0,0)`** | Already shipped — pose only nudge needed | At current `lookAt(0,0,0)` the BTR is behind-right of the initial gaze; user must rotate ~50° right and look down ~10° to acquire it. Recommend Phase 3 changes the `camera.lookAt(...)` call in `JTACController.tsx` to `(100, 1, 200)` so the BTR is centred on first frame. |
| BTR-80 | `(100, 1, 200)` | y=0° (axis-aligned box) | **Already shipped** (do not move) | `worldToGrid(100, 200)` → easting `round(600·0.999)=599`, northing `round(700·0.999)=699` → **canonical MGRS `599699`**. |
| Friendlies billboard — **current** | `(100, 2, 1000)` | billboarded | **Already shipped — but broken for demo** | `z=1000` is 500 m OUTSIDE the ground plane (plane half-extent is 500). Not visible from the vantage. `worldToGrid` clamps to `999`. 800 m due south of BTR — no single-digit misread can land within 75 m of this position while staying on the plane. |
| Friendlies billboard — **recommended (Phase 3 nudge)** | `(100, 2, 320)` | billboarded | **Phase 3 must apply** | 120 m due south of BTR. `worldToGrid(100, 320)` → `599819`. Inside the plane. The misread `599799` lands at impact `(99.6, 0, 300.3)` → 19.7 m from this friendlies position → triggers the "unsafe" verdict cleanly. Apply with a one-line edit in `src/scene/Friendlies.tsx`: change the `position` prop. |
| Ground plane | `(0, 0, 0)`, `1000 × 1000` | rotated -π/2 (XZ floor) | Already shipped | Don't touch. |

**Slant range from camera (0, 30, 80) to BTR (100, 1, 200):**
`sqrt(100² + 29² + 120²) = sqrt(10000 + 841 + 14400) = sqrt(25241) ≈ 158.87 m` → demo readout **`0159 m`**.

**Distance BTR → friendlies (recommended pos):** `sqrt(0² + 0² + 120²) = 120 m` (due south, +Z direction).

**ASCII top-down sketch (recommended geometry):**
```
            -Z (north)
              ↑
              |
              C   (camera @ (0, 30, 80) — eye 30 m up)
              |
              | gaze ↘
              |
              |       T   (BTR @ (100, 1, 200))
              |
              |       F   (friendlies @ (100, 2, 320) — 120 m S of BTR)
              |
              +─────→ +X (east)
```

The plane edge is at `x = ±500` and `z = ±500`. BTR sits comfortably inside; recommended friendlies position also inside.

---

## 4. Rangefinder UX spec

- **Keybind:** **`L`** (single-tap on `keydown`; not held). Document right-mouse-button as alternate; ship `L` only.
- **Trigger gating:** ignored unless `PointerLockControls` is locked (i.e. user has clicked into the canvas). Avoids accidental fires on page load.
- **Range computation:** straight-line distance from `camera.position` to the raycast hit point against the ground plane (the same plane `JTACController` already raycasts for the live MGRS). One-shot — no continuous tracking.
- **Visual feedback (on lase, in order):**
  1. **80 ms full-screen amber flash** at 6 % opacity (subtle veil over the entire viewport).
  2. **Reticle pulse** — inner crosshair scales to 1.4× for 200 ms then settles back to 1.0× (CSS transform on the existing `Reticle.tsx` element).
  3. **`RNG` HUD line gains a value:** zero-padded to 4 digits, monospaced, amber. Persists until the next lase or until reset.
- **Audible feedback:** single 1200 Hz square-wave **"ping"**, ~60 ms, via WebAudio (`OscillatorNode` + short envelope). No asset file. If `AudioContext` has not been user-unlocked yet, silently skip the audio.
- **HUD layout (top-right corner, anchored 16 px from top and right edges, monospace, amber `#ffb000`):**
  ```
  GRID  599699          ← live, updates ~10 Hz with crosshair (already shipped)
  RNG   0159 m          ← appears only after first lase, persists
  ```
  The `GRID` line continues to track the crosshair after a lase — **lase does NOT freeze the grid**, it only locks the `RNG` value. (This is the locked HUD-behavior decision from CONTEXT.)
- **Reset behavior of `RNG`:** the `R` keybind clears the `RNG` line entirely (line disappears until next lase).

---

## 5. 9-line brief card content (verbatim prefilled text)

Render as a faux-paper card overlay anchored bottom-left, ~320 px wide, semi-opaque cream background, dark serif text, with a thin amber border. Already in scope as Phase 2 / SCENE-05 (talk button + scenario card overlay) — this section supplies the verbatim text.

```
1. IP:                COWBOY
2. Heading:           150°
3. Distance from IP:  4.2 km
4. Target elevation:  GROUND LEVEL
5. Target description: BTR-80 armored personnel carrier, stationary
6. Target location:   [TGT_GRID]   ← LIVE: read MGRS off HUD; Hawg 21 echoes this digit-for-digit
7. Mark type:         LASER ([RNG] m slant)   ← LIVE: read range off HUD
8. Friendlies:        SOUTH 120 METERS, MARKED BLUE PANEL
9. Egress:            WEST
```

**Notes for the executor:**
- The brackets `[TGT_GRID]` and `[RNG]` are literal text on the card — the user reads the live HUD values aloud; the card does NOT auto-substitute. This keeps the visual stable and the human-in-the-loop legible.
- Heading `150°` is approximate target-bearing from camera (`atan2(100, 120) ≈ 39.8°` from north → bearing 040°… **correction:** at this geometry the BTR bears roughly 040° from the camera; we round to `150°` only if Phase 3 chooses to put a compass on screen. **For the demo card, use `150°` as a fictitious "approach heading" for Hawg 21 — it does not need to match scene geometry.** Heading on a 9-line is the *attack heading*, not the target bearing from JTAC.
- Line 4 in real CAS doctrine carries target elevation, not target grid. The verbatim text above is corrected vs the original plan body (which used `[TGT_GRID]` in line 4). Only **line 6** carries the MGRS that flows into `<grid>`.
- Phase 3 PILOT-03 specifies that the pilot must echo line 6 verbatim (no auto-correction). That contract is what makes Take B work.

---

## 6. Two-take demo script (verbatim)

Both takes use the same scene, same BTR position, same camera. Reset (`R`) between takes. The pilot's `<grid>` extraction is the **only** thing that differs between takes — it differs because the *human says different digits aloud*.

### Take A — Correct (target hit)

User has acquired the BTR in the reticle. Presses **`L`**. HUD shows:
```
GRID  599699
RNG   0159 m
```
User reads the 9-line into the mic:

> "Hawg 21, this is Fox 32, 9-line follows.
> Line 1: COWBOY.
> Line 2: heading one-five-zero.
> Line 3: four point two kilometers.
> Line 4: ground level.
> Line 5: BTR-80, dug in, broadside, stationary.
> Line 6: target location grid **five-niner-niner-six-niner-niner**.
> Line 7: laser, one-five-niner meters slant.
> Line 8: friendlies south one-two-zero meters, marked blue panel.
> Line 9: egress west.
> How copy?"

**Expected pilot readback (Phase 3 / PILOT-03):**
> "Fox 32, Hawg 21, copy target grid five-niner-niner-six-niner-niner, BTR-80, friendlies south one-two-zero, cleared hot. `<grid>599699</grid>`"

**Expected on-screen:** bomb falls at `gridToWorld("599699") ≈ (99.6, 0, 200.0)` → direct hit on BTR at `(100, 1, 200)`. Distance to target ≈ 0.4 m.

**Expected Phase 4 verdict:** **`solid`** (impact within ~30 m of target).

---

### Take B — Misread (visible miss, near friendlies)

After **`R`** reset (bomb removed, transcript cleared, range readout cleared, camera pose preserved), user re-acquires the same BTR in the reticle, presses **`L`** again. HUD again shows:
```
GRID  599699
RNG   0159 m
```
User deliberately misreads **the 4th digit on line 6 only** (`6` → `7`). Lines 1–5 and 7–9 are spoken identically to Take A:

> "Hawg 21, Fox 32, 9-line follows.
> Line 1: COWBOY.
> Line 2: heading one-five-zero.
> Line 3: four point two kilometers.
> Line 4: ground level.
> Line 5: BTR-80, dug in, broadside, stationary.
> Line 6: target location grid **five-niner-niner-SEVEN-niner-niner**.
> Line 7: laser, one-five-niner meters slant.
> Line 8: friendlies south one-two-zero meters, marked blue panel.
> Line 9: egress west.
> How copy?"

**Expected pilot readback:** the pilot echoes what was *heard* on line 6, not what was on the lased grid (this is the Phase 3 / PILOT-03 contract — pilot does NOT auto-correct):
> "Fox 32, Hawg 21, copy target grid five-niner-niner-seven-niner-niner, BTR-80, friendlies south one-two-zero, cleared hot. `<grid>599799</grid>`"

**Expected on-screen:** bomb falls at `gridToWorld("599799")`. Computing: e=599 → x = 599/0.999 - 500 = 599.6 - 500 = **99.6**; n=799 → z = 799/0.999 - 500 = 800.0 - 500 = **300.3**. Impact at `(99.6, 0, 300.3)`.
- Distance to BTR `(100, 1, 200)`: `sqrt(0.4² + 0² + 100.3²) ≈ **100.3 m**` — clear, visible miss; bomb lands well south of the vehicle, on bare ground.
- Distance to friendlies `(100, 2, 320)` (recommended): `sqrt(0.4² + 0² + 19.7²) ≈ **19.7 m**` — **inside the 75 m friendlies-safety threshold.**

**Expected Phase 4 verdict:** **`unsafe`** — citing impact within 75 m of friendlies.

#### Why the 4th digit (`6 → 7`)
- Position 4 is the **first digit of the northing** (digit weight: 100 m per integer unit in faked-MGRS). A single-step bump (`6 → 7`) moves impact +100 m in `+Z` (south) — large enough to clearly miss the BTR (100 m off), small enough to land near the recommended friendlies position (20 m away).
- Position 1 (first easting digit) `5 → 6` would move impact +100 m east → `(199.6, 0, 200)` → 100 m from BTR but 144 m from friendlies-recommended → too far for "unsafe".
- Position 2 (second easting digit) `9 → 8` is a -10 m east shift → barely visible. Bad demo.
- Positions 5/6 (last two northing digits) are 10 m and 1 m steps → invisible at the camera distance. Bad demo.

#### Fallback if friendlies relocation is rejected
If Phase 3 declines the friendlies relocation and ships with friendlies at the original `(100, 2, 1000)`:
- The friendlies are 800 m due south of BTR and 500 m off the ground plane. **No single-digit misread can land an impact within 75 m of them.**
- Recommended fallback: change the demo punchline. Either (a) widen the "unsafe" verdict threshold to 250+ m and misread `5 → 6` at position 4 (impact at `(99.6, 0, 400.4)` → 600 m from friendlies — still doesn't trigger; abandon "unsafe"), or (b) reframe Take B as "miss" only (no "unsafe" verdict) — Phase 4 still scores it as `miss` based on distance-to-target.
- **Strong recommendation: ship the friendlies relocation.** It's a one-line edit and it preserves the demo's punchline.

#### Time budget
- Take A: ~75 s spoken + ~10 s pilot readback + ~5 s bomb fall = **~90 s**.
- `R` reset + reorient: **~3 s**.
- Take B: same as Take A = **~90 s**.
- Total demo loop: **~3 min** + ~1 min slack for Phase 4 debrief panel = comfortably under the 5 min user-told-the-story window.

---

## 7. Reset mechanism

- **Keybind:** **`R`** — single-tap (not held). `keydown` listener attached at the canvas / window level; ignored unless `PointerLockControls` is locked.

- **What resets (cleared on `R`):**
  - Bomb impact meshes despawned (sphere + ring + smoke removed from the scene graph).
  - `RNG` HUD line cleared (line disappears until the next lase).
  - DebugPanel voice transcript log cleared.
  - Pilot session: emit a `session.reset` event to the ws-server (re-uses the Phase 1 contract). **If the ws-server doesn't yet implement `session.reset`**, the frontend's fallback is to drop the existing `WebSocket` and open a new one — Phase 3 owns the call on which path is cheaper. The one-line ws-server edit (`if (msg.type === 'session.reset') { resetSession(); }`) is preferred and keeps the audio context unlocked.

- **What persists (NOT cleared on `R`):**
  - Camera pose — user keeps looking at the BTR; no re-aiming penalty.
  - PointerLock state — mouse stays captured; no second click required.
  - Scene/assets — no React re-mount, no GLB reload.
  - `AudioContext` unlock state — user does not need to re-grant the mic.
  - The live `GRID` HUD line — keeps tracking the crosshair as before.

- **Time budget:** `R`-press to "ready for Take B" must be **< 2 s**. If `WebSocket` reconnect is the chosen reset path and it costs > 1 s, switch to the in-session `session.reset` event and own the one-line ws-server edit in Phase 3.

---

## 8. Cross-phase integration notes

| Scenario element | Phase | Requirement ID | How it's satisfied |
|---|---|---|---|
| Live MGRS HUD | 2 | SCENE-02 | **Already shipped** in `Reticle.tsx` + `JTACController.tsx`. |
| Reticle / amber crosshair | 2 | SCENE-02 | **Already shipped.** `RNG` line is a small extension (~10 LOC) — flag for Phase 3 to absorb, not a new SCENE task. |
| BTR placement at `(100, 1, 200)` | 2 | SCENE-04 | **Already shipped** in `Target.tsx`. This doc locks the value. |
| Friendlies billboard placement | 2 → 3 nudge | SCENE-04 | Shipped at `(100, 2, 1000)` but **broken for demo**. Phase 3 nudge to `(100, 2, 320)` — one-line edit in `Friendlies.tsx`. |
| Camera initial `lookAt` toward BTR | 2 → 3 nudge | SCENE-01 | Shipped looking at origin. Phase 3 nudge to `lookAt(100, 1, 200)` — one-line edit in `JTACController.tsx`. |
| `L`-key rangefinder + ping + `RNG` HUD slot | **3** | NEW (absorb into PILOT plan) | New small frontend addition (5–10 min): `keydown` listener, raycast, distance, WebAudio ping, second HUD line, Zustand `lastLasedRangeM` field. Does NOT warrant a new phase. |
| 9-line scenario card overlay | 2 | SCENE-05 | Card markup not yet shipped (per STATE). Use the verbatim text from §5. |
| `<grid>NNNNNN</grid>` extraction | 3 | PILOT-02 | One-line ws-server edit. Out of scope here; this doc supplies the digits. |
| `BombImpact` falls at `gridToWorld(transmittedGrid)` | 3 | PILOT-05 | Out of scope here; this doc supplies the expected impact coordinates for both takes. |
| Misread → off-target impact | 3 | PILOT-06 | **This scenario is the demonstration** of "demonstrably wrong grid misses". |
| Distance-to-target / distance-to-friendlies capture | 4 | BRIEF-01 | Out of scope here; this doc supplies the expected distances (Take A: 0.4 m / 120 m; Take B: 100.3 m / 19.7 m). |
| `solid` verdict from Take A | 4 | BRIEF-04 | Threshold suggested: impact within 30 m of target → `solid`. |
| `unsafe` verdict from Take B | 4 | BRIEF-04 | Threshold suggested: impact within 75 m of friendlies → `unsafe`, regardless of target distance. |
| `R`-key reset | 3 | PILOT-06 (or Phase 5 polish) | New small frontend addition: clear bomb meshes, clear `RNG`, clear transcript, emit `session.reset`. |

---

## Locked values appendix

The single source of truth for hardcoded constants. Phase 3 should put these in a `src/lib/demo.ts` constants module so they're greppable.

| Constant | Value |
|---|---|
| Canonical target MGRS | `599699` |
| Misread MGRS (Take B) | `599799` |
| Misread digit position | `4` (first northing digit) |
| Misread change | `6` → `7` |
| Camera position | `(0, 30, 80)` |
| Camera initial `lookAt` (recommended) | `(100, 1, 200)` |
| BTR position | `(100, 1, 200)` |
| Friendlies position (current shipped) | `(100, 2, 1000)` — **broken for demo** |
| Friendlies position (recommended for Phase 3) | `(100, 2, 320)` |
| Slant range, camera → BTR | `159 m` (display `0159 m`) |
| Distance, BTR → friendlies (recommended) | `120 m` |
| Take A expected impact | `(99.6, 0, 200.0)` — 0.4 m off BTR |
| Take B expected impact | `(99.6, 0, 300.3)` — 100.3 m off BTR, 19.7 m off friendlies |
| Verdict threshold (target hit) | impact within `30 m` of BTR → `solid` |
| Verdict threshold (friendlies safety) | impact within `75 m` of friendlies → `unsafe` |
| Lase keybind | `L` (alt: RMB; not shipped) |
| Reset keybind | `R` |
| Lase ping | 1200 Hz square wave, 60 ms, WebAudio |
| `RNG` HUD format | `RNG   NNNN m` (zero-padded to 4 digits, monospace, `#ffb000`) |
