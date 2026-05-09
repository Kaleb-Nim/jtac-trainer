---
quick_id: 260509-tts-persona-voice
created: 2026-05-09
status: complete
---

# Quick Task: Switch Alibaba Realtime TTS to persona-based voice

Replace the cloned `DASHSCOPE_VOICE_ID` flow in `ws-server/src/dashscope/tts.ts`
with a Qwen3-TTS preset persona voice. Default to `Ethan` (male English) so the
JTAC pilot AI uses an authoritative pilot tone out of the box. Keep the env var
as an override hook for swapping personas without code changes.

## Tasks

1. **tts.ts** — default `voiceId` to `'Ethan'` when `DASHSCOPE_VOICE_ID` is unset; update header/JSDoc/inline comments to reflect persona voice (no longer cloned).
2. **.env.example** — document the persona options and set the default to `Ethan`.

## Verify

- `bunx tsc --noEmit` clean in `ws-server/`.
- `session.update` sent on TTS WS open carries `voice: "Ethan"` when env unset.
