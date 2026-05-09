---
quick_id: 260509-tts-persona-voice
status: complete
completed: 2026-05-09
---

# Summary: Switch Alibaba Realtime TTS to persona voice

## Changed

- `ws-server/src/dashscope/tts.ts` — `voiceId` now defaults to `'Ethan'` when `DASHSCOPE_VOICE_ID` is unset. Header comment, JSDoc, and inline comment updated to describe a Qwen3-TTS persona voice instead of a cloned voice.
- `.env.example` — `DASHSCOPE_VOICE_ID` documented with persona options (Ethan, Dylan, Cherry, Chelsie, Serena) and default set to `Ethan`.

## Verified

- `bunx tsc --noEmit` clean in `ws-server/`.

## Notes

- Env var name kept (`DASHSCOPE_VOICE_ID`) to avoid touching deploy configs; semantic shift only — value is now a Qwen-provided persona name, not a cloned-voice ID.
- Browser cannot configure the voice (T-02-08 still holds — env-only).
