---
artifact: PITCH
project: jtac-trainer
target_runtime: 60–90s recorded video
authored: 2026-05-09
locked_inputs:
  - .planning/PROJECT.md
  - .planning/phases/03-jtac-pilot-persona-grid-bridge/03-CONTEXT.md
canonical_grids:
  correct: "599699"
  misread: "599799"
  misread_digit_position: 3
  misread_change: "6 → 7"
---

# Pitch Package — `jtac-trainer`

> Realistic JTAC voice training without the pilots, the controllers, or the range.

---

## 1. Tagline

**"JTAC reps without the manpower crunch. Twenty 9-lines before lunch — solo, on a laptop."**

(15 words across two sentences — read as one beat. Demoable: every clause maps to something on screen.)

Backup taglines (lean on whichever resonates with the audience):

- "Realistic JTAC training, without booking a pilot or a range."
- "The reps you need. Without the people you don't have."
- "An AI pilot that's good enough to drill against — and gives you the miss when you earn it."
- "From booking a controller to opening a tab."

---

## 2. Hook bank (5 cold opens, ≤8s each) — training-first

Each hook leads with the *training problem* the trainee actually has, not the consequence theater. The two-take wrong-grid demo is what *proves* the trainer is faithful — but it's not the pitch.

### H1 — Manpower crunch (recommended)
> "To train one JTAC for one nine-line, you need a pilot, a controller, and a range. Most days, you get none of those. So you don't train."

*Tone:* matter-of-fact, slightly resigned. Pairs with: black screen → fade up on a single trainee at a laptop, headset on, lased BTR on screen.

### H2 — Reps as the real problem
> "Competence comes from reps. In CAS, reps cost a sortie. We made the reps cost a tab."

*Tone:* punchy, three-beat. Pairs with: rapid montage of three back-to-back 9-line takes (different MGRS each time), HUD resetting between them. End on the live demo's HUD.

### H3 — Realism without the cost
> "Real JTAC training is realistic because it's expensive — pilots, fuel, controllers, ordnance. We kept the realism. We dropped the bill."

*Tone:* thesis-forward, slightly cocky. Pairs with: split-screen — left: stock footage of an A-10 on a range (greyed out); right: the live HUD with bomb falling on cue.

### H4 — Skill-transfer first
> "The thing that gets a JTAC qualified isn't the bomb. It's the cadence, the comms register, the way you call a grid. You can practice all of that alone now."

*Tone:* instructional, calm. Pairs with: tight shot on the 9-line card and the trainee speaking into the headset; pilot voice replies in clipped CAS register.

### H5 — Curiosity / training stakes
> "What if you could fail a 9-line, *out loud*, twenty times before anyone qualified you to do it for real?"

*Tone:* inviting, slightly conspiratorial. Pairs with: slow zoom on the reticle as the live MGRS scrolls; cut to the off-target Take B impact on the question mark.

**Recommended for first take:** **H1 (manpower crunch).** It frames the trainee's actual constraint in 14 seconds, makes the demo feel inevitable, and lets the wrong-grid moment land as proof of fidelity rather than as the entire thesis. **H2 is the alternative** if the audience is operations-coded and responds to "reps." H3 is for an investor / acquisitions audience.

---

## 3. 60–90s recorded-video script

| Time | Voiceover | On-screen |
|---|---|---|
| **0:00–0:14** | *Hook (use H1):* "To train one JTAC for one nine-line, you need a pilot, a controller, and a range. Most days, you get none of those. So you don't train." | Black → fade up on a single trainee at a laptop, headset on. Reticle centered on a BTR. Live MGRS `599699` ticking in HUD. Title card under-thirds: **`jtac-trainer`** / "realistic reps, solo." |
| **0:14–0:22** | "This is the trainer. FPS view. One target. Same comms loop you'd run on a range — without the range." | Wide shot of the scene: hill vantage, BTR mid-distance, blue friendlies billboard NE. HUD MGRS scrolling as the camera sweeps. |
| **0:22–0:30** | "Lase the target. Read the nine-line. The pilot is an LLM in a clipped A-10 register — Hawg 21." | L-key lase: amber flash + ping. `RNG  0253 m` appears. 9-line card slides in bottom-left. |
| **0:30–0:42** | *(JTAC voice, in-character)* "Hawg 21, Fox 32, target grid five-nine-nine, six-nine-nine, BTR-80, friendlies northeast eighty meters, cleared hot." | Caption the digits as they're spoken. Pilot voice replies clipped: *"Fox 32, copy, target five-nine-nine, six-nine-nine, in hot."* Bomb falls. Hit on BTR. Green **SOLID** badge in debrief corner. |
| **0:42–0:50** | "That's a clean rep. The interesting question for a trainer is what happens when *you* fumble the read." | R-key reset. HUD clears, bomb scrub clears, scene resets. Same MGRS still on HUD. |
| **0:50–1:04** | *(JTAC voice, deliberately slower)* "Hawg 21, target grid five-nine-nine… **seven**-nine-nine." | Red caption flashes on the **7**. Pilot echoes the misread — *not* a correction: *"Copy, five-nine-nine, seven-nine-nine, in hot."* Bomb falls. Lands on the friendlies billboard. Debrief panel: **UNSAFE — friendly fire** + prose critique. |
| **1:04–1:18** | "The pilot heard exactly what you said. That's the point. The trainer is faithful enough to hand you the consequence — so the rep actually counts." | Slow zoom on the off-target crater next to the blue billboard, then pull out to show the debrief critique text scrolling in. |
| **1:18–1:30** | "Realtime voice. In-character pilot. End-to-end on the browser. The reps you need — without the people you don't have. `jtac-trainer`." | Three-line tech card: **`ASR → LLM → TTS`** (DashScope) / **`<grid>NNNNNN</grid>`** bridges voice → world / **`Next.js + r3f on Vercel`**. Then CTA card: live URL + handle, AIE Open Canvas tag. Fade on "people you don't have." |

**Total runtime:** ~90s at conversational pace. **60s cut path:** see §7 — collapse 0:14–0:22 (let H1 + the lase do the worldbuilding), trim Take A pilot readback to "Copy, cleared hot.", merge tech card with CTA.

**Narrative arc this version commits to:**
1. **Problem (0:00–0:14):** trainees can't get reps; the system gates them on manpower they don't have.
2. **Solution shape (0:14–0:30):** here's the same loop, solo, on a laptop.
3. **Proof of fidelity (0:30–1:04):** clean rep + misread rep. The misread isn't the headline — it's the evidence that the trainer doesn't lie to you.
4. **Thesis + tech credit (1:04–1:30):** the rep counts because the consequence is real-feeling. Tech credit. CTA.

---

## 4. B-roll / shot list (capture in this order)

1. **Reticle sweep** — mouse-look across terrain, MGRS digits scrolling live in HUD. Capture 6–8s of clean footage; you'll cut tight.
2. **Lase event** — single L-key press at rest on the BTR. Capture the amber flash, the ping (record clean audio), the `RNG  0253 m` line appearing. Three takes minimum.
3. **9-line card slide-in** — animation from off-screen-left to bottom-left rest position. Two takes.
4. **Take A bomb sequence** — full 9-line read → pilot readback → bomb fall → impact ring + smoke → SOLID badge. One continuous take, no cuts. Run this five times; pick the cleanest readback.
5. **Reset** — R-key, HUD/scene reset. Capture the snap-back at full frame rate (this is your visual "cleanse" between takes).
6. **Take B bomb sequence** — same as #4 but with the deliberate `seven` substitution. Bomb on friendlies billboard. UNSAFE verdict. **This is the money shot — run it ten times if needed.**
7. **Slow-zoom on UNSAFE impact** — push in on the off-target crater + blue billboard. 6s of footage; you'll use 4.
8. **Tech-card transition footage** — neutral background or HUD-only frame, 5s, for the overlay card to sit on.
9. **CTA hold** — final scene composition with HUD visible but no action; 5s for the URL/handle card.

---

## 5. Voiceover delivery notes

- **Pace:** conversational, ~155 wpm overall. Slow to ~120 wpm for the JTAC in-character lines (real CAS comms are clipped and deliberate on numbers).
- **Pauses:** half-beat pause after every numeric grid digit-group ("five-nine-nine *(beat)* six-nine-nine"). Full beat before "So you don't train." (end of H1 hook) — let it hang.
- **Sync points:**
  - "So you don't train." (~0:13) → fade-up on the trainee at the laptop must land on "train", not before. This is the emotional beat of the whole pitch.
  - "what happens when *you* fumble the read." (~0:50) → R-key reset visual hits on "read".
  - The deliberate **"seven"** (~0:54) → on-screen caption flashes red on the same frame the word lands.
  - "the rep actually counts." (~1:18) → debrief critique text reaches end-of-line on "counts".
  - "people you don't have." (~1:29) → fade-to-black starts on the "h" of "have".
- **Tone shift:** H1 hook is matter-of-fact / slightly resigned (mirroring the trainee's reality). 0:14–0:42 is instructional / curious. 0:42–1:04 lowers and slows (the misread is the serious moment). 1:04–1:18 is quiet, almost confiding. CTA at 1:18+ lifts back to forward-looking.
- **Pilot voice:** record separately, lightly bandpass-filtered (300–3000 Hz) to read as radio. If no time for filter, keep it dry — the contrast with the narrator voice is what sells "two parties on a radio." **Critical for the training framing:** the pilot must echo line 6 verbatim (including the misread `seven`), with no audible "correction" inflection. The whole credibility of the trainer rests on the pilot not bailing the trainee out.
- **Narrator voice positioning:** speak *to* a trainee or unit-trainer audience, not *about* them. "You don't train" lands harder than "they don't train."

---

## 6. Locked facts the script must not change

- Canonical correct MGRS: **`599699`**
- Misread MGRS: **`599799`** (digit position 3, `6 → 7`)
- Friendlies are northeast of target; misread shifts impact ~80–100m onto the friendlies billboard
- Pilot callsign: **Hawg 21**. JTAC callsign: **Fox 32**.
- Tech credits: DashScope ASR/LLM/TTS, Next.js + react-three-fiber, deployed on Vercel
- Hackathon: AIE Open Canvas, 6-hour sprint

---

## 7. If you only have 60 seconds

Cut in this order — preserves the training framing:

1. **Collapse 0:14–0:22** ("This is the trainer. FPS view…") into a single 4s line: *"Same comms loop, solo, on a laptop."* Let the H1 hook + the lase do the worldbuilding.
2. **Compress Take A pilot readback** to one line: *"Copy, in hot."* Saves ~3s.
3. **Merge the tech card and CTA** (1:18–1:30 → 1:18–1:25): one card showing **`ASR → LLM → TTS · <grid> bridge · Next.js / r3f / Vercel`** + URL underneath. Fade-out word becomes "have."

Result: ~60s. **What you keep:** H1 manpower-crunch hook (full 14s — non-negotiable, this is the pitch), the clean rep, the misread rep, and the "rep actually counts" thesis. **What you lose:** the worldbuilding wide shot and the slow zoom on the debrief critique. Both are nice-to-have, neither carries the framing.
