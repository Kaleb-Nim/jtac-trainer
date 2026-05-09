# Project State: JTAC CAS 9-Line Voice Trainer

## Current Status

**Milestone**: v0.1 Hackathon Submission
**Active Phase**: Phase 1 — Voice Scaffold (partial)
**Sprint clock**: 6h, started 2026-05-09

## Last Action

Initial scaffold commit `05d3fe6`:
- Next.js 16 + Tailwind v4 (note: scaffolder forced `src/` layout — `app/` paths in plan are now `src/app/`)
- ws-server/ copied verbatim from nim-kaleb (DashScope ASR/LLM/TTS)
- src/hooks/useRealtimeVoice.ts copied
- Skeleton dirs: src/scene/, src/components/, src/lib/, prompts/
- Stub prompts/system-prompt.md, .env.example, README

## Next Action

Phase 1 remaining tasks:
1. `bun install` in repo root and in `ws-server/`
2. Set DashScope env vars (DASHSCOPE_API_KEY, DASHSCOPE_VOICE_ID)
3. Boot ws-server: `bun ws-server/src/index.ts`
4. Wire bare talk button on `src/app/page.tsx`
5. Confirm voice round-trip

Then Phase 2 (3D scene).

## Open Risks

- DashScope outage during demo → mitigation: backup screen recording (Phase 6)
- LLM `<grid>` tag unreliability → mitigation: few-shot examples + post-call extraction fallback (Phase 3 tripwire)
- 3D scene overruns 90 min → mitigation: 2D top-down map fallback (Phase 2 tripwire)
- Vercel WSS → ECS CORS/cert issues → mitigation: run frontend locally on stage (Phase 5 tripwire)
- Safari mic permissions → Chrome-recommended note in README + on landing

## Notes

- nim-kaleb `AGENTS.md` got copied via `create-next-app` template — it warns "This is NOT the Next.js you know, read node_modules/next/dist/docs/ before writing code". Consult when touching routing/server-component patterns.
- Plan source of truth: `.planning/PLAN.md` (also at `~/.claude/plans/entering-the-aie-open-enumerated-bentley.md`).

---
*Last updated: 2026-05-09 after starter commit*
