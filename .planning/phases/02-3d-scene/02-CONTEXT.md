# Phase 2: 3D scene — Context

**Gathered:** 2026-05-09
**Status:** Ready for planning
**Source:** Distilled from `.planning/intel/original-plan.md` Phase 2 + on-disk audit

<domain>
## Phase Boundary

Reach the gate: **mouse-look works in a fullscreen r3f scene with terrain, a target GLB, friendlies billboard; HUD reticle shows a live changing 6-digit MGRS grid as the camera turns.** The talk button (Phase 1) becomes an overlaid HUD element; a small scenario card sits in a corner. No persona behavior changes, no `<grid>` tag bridge (Phase 3), no bomb impact (Phase 3), no debrief (Phase 4), no aesthetic polish beyond what's needed to read the HUD (Phase 5).

Time budget: 90 min. **Tripwire at 60 min:** if the target isn't on screen with reticle showing a live grid, fall back to a 2D Canvas top-down map per original plan's risk register.

</domain>

<decisions>
## Implementation Decisions

### Stack
- `three`, `@react-three/fiber`, `@react-three/drei` — added via `bun add` (NOT in package.json yet)
- `zustand` — minimal state store for the live reticle grid + transmitted grid + transcript+impact result placeholders (used by later phases too)
- All 3D code lives under `src/scene/` (matches original plan's `app/scene/` layout, adapted to `src/` aliasing)
- Scene is a single client component (`'use client'`) consumed by `src/app/page.tsx`

### Faked MGRS
- Ground plane: 1000m × 1000m centered at origin, axis-aligned (X east, Z south so positive Z = south = below the camera looking forward)
- `worldToGrid(x, z)`: clamp `x` and `z` into `[0, 999]` (offset from `-500..500` to `0..999` linearly via `Math.round((coord + 500) * 0.999)`), zero-pad to 3 digits each, concat → 6-char string. Round-trip exact for integer coords.
- `gridToWorld(grid)`: inverse — split, parse, undo offset, return `{x, z, y: 0}`.
- This is intentionally NOT real MGRS; demo signal only.

### Camera + controls
- Fixed observation post: position `[0, 30, 80]` (30m up, 80m south of origin), lookAt origin
- `PointerLockControls` from drei — mouse-look only, no movement
- Pointer-lock is engaged on first click anywhere in the canvas; ESC releases (browser default)
- FOV 60°

### Scene contents
- `Terrain.tsx` — flat 1000×1000 plane, low-poly grass-green material (no displacement, no texture)
- `Target.tsx` — for sprint speed: a single red-orange box (3m × 2m × 5m) at world `[100, 1, 200]` (north-east of camera), labeled by being the only red object. **Defer GLB loading to Phase 5 polish if time permits** — original plan's "free GLB tank from Poly Pizza" is nice-to-have, not blocker. Plan should wire as a box; comment notes the upgrade path.
- `Friendlies.tsx` — blue diamond billboard (drei `<Billboard>` + small octahedron) at world `[100, 2, 1000]` (800m south of target = south-of-target as original plan specified)
- `JTACController.tsx` — wraps PointerLockControls and exposes the camera ref for raycasting

### Reticle + raycast
- `Reticle.tsx` — CSS overlay (NOT a 3D mesh). Centered crosshair `+`, plus a small text block "GRID: NNNNNN" near the crosshair. Subscribed to a Zustand store updated each frame.
- `useReticleGrid.ts` (or inlined into JTACController) — a `useFrame` callback inside the Canvas that:
  1. Builds a `THREE.Raycaster` from camera (origin at camera world pos, direction = camera forward unit vector via `camera.getWorldDirection`)
  2. Intersects against the ground plane `THREE.Plane(new Vector3(0,1,0), 0)` using `ray.intersectPlane`
  3. If hit point exists, calls `worldToGrid(hit.x, hit.z)` and writes to the Zustand store
  4. Throttled to ~10 Hz (every 6 frames) — no need for 60Hz grid updates
- Reticle component reads grid via `useStore(s => s.reticleGrid)` — re-renders only when grid string changes

### Page composition
- `src/app/page.tsx` becomes: `<Scene />` fullscreen + HUD overlay (`<Reticle />`, `<ScenarioCard />`, `<TalkButton />`)
- The TalkButton is the existing useRealtimeVoice button extracted into its own component `src/components/TalkButton.tsx` so the page stays composition-only
- Smoke-test transcript/response `<pre>` blocks from Phase 1 stay (toggleable later) for debugging — render them in a corner panel that can collapse

### Scenario card
- `src/components/ScenarioCard.tsx` — top-right corner, fixed-width (~280px), mil-spec mono on dark/translucent
- Hardcoded scenario per original plan: "Armor column reported at grid 600200. Friendlies 800m south. No-strike zone east of the column."

### What this phase does NOT do
- No GLB loader, no models — boxes only (upgrade path noted)
- No persona changes (Phase 3)
- No bomb impact (Phase 3)
- No `<grid>` tag extraction (Phase 3)
- No mil-spec aesthetic beyond functional readability (Phase 5)
- No bandpass radio filter (Phase 5)

### Claude's Discretion
- Exact box dimensions / positions for target/friendlies (must fit in view; numbers above are starting point)
- Whether to use `OrbitControls` clamped vs `PointerLockControls` if pointer-lock has Next.js 16 dev-server quirks (PointerLockControls preferred; fall back if blocked)
- Whether the raycast utility is a hook or a component-internal `useFrame`
- Reticle CSS styling exact colors (amber/green on dark is the brief; exact hex flexible)
- Whether to keep the Phase 1 transcript/response panels visible by default — recommendation: yes for debug, behind a small "[debug]" toggle if cluttered

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project files to read
- `./AGENTS.md` — Next.js 16 has breaking changes; consult `node_modules/next/dist/docs/` for App Router specifics
- `./CLAUDE.md` — points at AGENTS.md; reminds about Bun > npm, LSP for code navigation, MacOS frameworks
- `./.planning/PROJECT.md`, `./.planning/REQUIREMENTS.md`, `./.planning/ROADMAP.md`
- `./.planning/intel/original-plan.md` — Phase 2 section + risk register (fallback to 2D map at 60-min tripwire)
- `./src/app/page.tsx` — current Phase 1 smoke-test page; will be reorganized into HUD-overlay-on-Scene composition
- `./src/app/layout.tsx` — keep as-is
- `./src/hooks/useRealtimeVoice.ts` — unchanged this phase; consumed by extracted TalkButton
- `./package.json` — confirm three/r3f/drei/zustand are NOT yet installed; this phase adds them
- `./tsconfig.json` — `@/*` → `./src/*` paths mapping

### External docs to consult (use Context7 if uncertain)
- react-three-fiber v8/v9 setup with Next.js App Router (client component, `<Canvas>`, `useFrame`)
- @react-three/drei `<PointerLockControls>` and `<Billboard>` props
- THREE.js Raycaster + Plane.intersectPlane usage
- zustand v4 minimal store pattern (a single `create<>()` with grid string field)
</canonical_refs>

<specifics>
## Specific Ideas

- File map (new):
  - `src/lib/grid.ts` — `worldToGrid(x:number, z:number): string` and `gridToWorld(g:string): {x:number, y:number, z:number}`. Pure functions. Round-trip tested by grep + smoke.
  - `src/lib/store.ts` — Zustand store: `{ reticleGrid: string; setReticleGrid: (g: string) => void; transmittedGrid: string | null; setTransmittedGrid: (g: string|null) => void; impactResult: null; setImpactResult: (r: any) => void }`. Phase 3+ will use the latter fields.
  - `src/scene/Scene.tsx` — top-level Canvas, lights, controller, terrain, target, friendlies, raycast useFrame
  - `src/scene/Terrain.tsx` — `<mesh rotation-x={-Math.PI/2}><planeGeometry args={[1000, 1000, 1, 1]} /><meshStandardMaterial color="#3b5d3a" /></mesh>`
  - `src/scene/Target.tsx` — red box at world position
  - `src/scene/Friendlies.tsx` — `<Billboard>` with blue octahedron mesh
  - `src/scene/JTACController.tsx` — sets camera fixed position + PointerLockControls
  - `src/components/Reticle.tsx` — CSS HUD overlay
  - `src/components/ScenarioCard.tsx` — top-right card
  - `src/components/TalkButton.tsx` — extracted from page.tsx; uses useRealtimeVoice
  - `src/components/DebugPanel.tsx` — optional: collapsible panel showing transcript/response
- Page composition (`src/app/page.tsx`) becomes:
  ```tsx
  <main className="relative h-screen w-screen overflow-hidden bg-black font-mono">
    <Scene />                  {/* fills the whole screen */}
    <Reticle />                {/* fixed-center crosshair + grid */}
    <ScenarioCard />           {/* top-right */}
    <TalkButton />             {/* bottom-center */}
    <DebugPanel />             {/* bottom-left, collapsible */}
  </main>
  ```
- Grid math test (no jest in scope; just smoke):
  - `worldToGrid(0, 0)` should return `"500500"` (origin → middle of grid)
  - `worldToGrid(-500, -500)` should return `"000000"`
  - `worldToGrid(500, 500)` should return `"999999"`
  - `gridToWorld("500500")` should return `{x: ~0, y: 0, z: ~0}` within 1m tolerance
- Pointer-lock UX: scene renders an instruction overlay "Click to look around" until pointer-lock engages. Drei's PointerLockControls supports a `selector` prop for the trigger element if needed.
- Raycast cadence: throttle in the `useFrame` via a frame counter ref; only update store every 6 frames (~10 Hz at 60fps).
</specifics>

<deferred>
## Deferred Ideas

- GLB tank model from Poly Pizza/Sketchfab CC0 — Phase 5 polish (boxes work for the demo)
- Multiple scenarios / scenario picker — out of scope, single hardcoded scenario forever
- Terrain heightmap / displacement — out of scope (flat plane is fine)
- Real MGRS math — replaced by faked 6-digit grid forever
- Mil-spec aesthetic (amber/green palette, callsign header, radio SFX) — Phase 5
- Bandpass radio filter on TTS — Phase 5
- Bomb impact mesh + animation — Phase 3
- `<grid>` tag extraction in ws-server — Phase 3
- Debrief panel — Phase 4
</deferred>

---

*Phase: 02-3d-scene*
*Context gathered: 2026-05-09 — bypassed /gsd-discuss-phase due to 6h sprint constraint and detailed intel/original-plan.md*
