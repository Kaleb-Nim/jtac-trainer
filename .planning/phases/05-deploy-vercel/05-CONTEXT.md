# Phase 5: Deploy to Vercel — Context

**Gathered:** 2026-05-09
**Status:** Ready for planning
**Source:** User directive (no discuss-phase)

<domain>
## Phase Boundary

Ship the current frontend (Phase 1–4 features) to Vercel production via CLI. ws-server is already deployed at `wss://ws.kalebnim.dev/ws` (ECS) — no work there.

**In scope:**
- Link project to Vercel (`vercel link`)
- Configure production env vars (`NEXT_PUBLIC_WS_URL`, `DASHSCOPE_API_KEY`)
- `vercel --prod` deploy
- Smoke-test deployed URL (full Take A → Take B loop) — DEPLOY-02

**Out of scope (deferred to Milestone 2):**
- POLISH-01: Mil-spec aesthetic (mono font, amber/green HUD)
- POLISH-02: TTS bandpass filter
- POLISH-03: Latency tuning under 800ms TTFA
- All visual/UX polish

</domain>

<decisions>
## Implementation Decisions

### Hosting
- **Platform:** Vercel (frontend only)
- **Auth:** User already logged in via `vercel` CLI
- **Project linking:** `vercel link` (interactive — pick/create project, write `.vercel/project.json`)
- **No `vercel.ts` config needed** — defaults work for App Router; framework auto-detected

### Environment Variables
Production env on Vercel must have:
- `NEXT_PUBLIC_WS_URL=wss://ws.kalebnim.dev/ws` — baked in at build time (NEXT_PUBLIC_*)
- `DASHSCOPE_API_KEY=...` — runtime secret for `/api/debrief` route (qwen-plus call)

`DASHSCOPE_VOICE_ID` is ws-server only — NOT needed on Vercel.

### Deploy Command
- `vercel --prod` from repo root after link + env setup
- Build command auto-detected (`bun run build` → `next build`)
- Output: production URL (typically `<project>.vercel.app`)

### Smoke Test
- Open deployed URL in Chrome desktop
- Mic permission grant
- Take A: lase BTR, read 9-line correctly → solid verdict
- Take B: reset, misread digit 4 → unsafe verdict mentioning friendlies
- No console errors throughout
- Total time <2 min (DEPLOY-02 target)

### Claude's Discretion
- Whether to also test on phone hotspot (DEPLOY-02 says "phone hotspot" — defer if desktop loop passes; flag as known untested)
- Whether to commit `.vercel/project.json` (default: yes — it's the team-shareable link, not a secret)
- Whether to add `vercel-deployment-url` to README (defer to Phase 6)

### Requirements Reassignment
- **DEPLOY-01, DEPLOY-02** — addressed by this phase
- **POLISH-01, POLISH-02, POLISH-03** — moved to Milestone 2 backlog (REQUIREMENTS.md update is a Phase 5 task)

</decisions>

<canonical_refs>
## Canonical References

### Vercel deploy
- Vercel CLI 51.8.0 installed at `/Users/kalebnim/.bun/bin/vercel`
- `vercel.com/docs/cli` — official CLI docs
- Default function timeout: 300s (Fluid Compute) — `/api/debrief` qwen-plus call fits comfortably

### Project files
- `package.json` — `"build": "next build"`, `"dev": "next dev"`, `"start": "next start"` already configured
- `src/app/api/debrief/route.ts` — Phase 4 route, requires `DASHSCOPE_API_KEY` at runtime
- `src/hooks/useRealtimeVoice.ts` — reads `process.env.NEXT_PUBLIC_WS_URL` (build-time)
- `.env.example` — documents the three env vars

### Upstream contracts
- ws-server: `wss://ws.kalebnim.dev/ws` (ECS, owned by user, not part of this phase)

</canonical_refs>

<specifics>
## Specific Ideas

- Use `vercel env add` per env var with stdin piping (not interactive prompts) so the executor doesn't block on TTY
- Or use `vercel env pull` to verify after setting
- After deploy, capture the production URL into `.planning/phases/05-deploy-vercel/05-DEPLOY-URL.txt` for Phase 6 README work

</specifics>

<deferred>
## Deferred Ideas (Milestone 2)

- POLISH-01: Mil-spec aesthetic
- POLISH-02: TTS bandpass radio filter
- POLISH-03: Latency tuning
- Custom domain (use default `*.vercel.app`)
- Preview deployments / CI/CD wiring
- Analytics, observability beyond default Vercel dashboard

</deferred>

---

*Phase: 05-deploy-vercel*
*Context gathered: 2026-05-09 via user directive*
