import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const LOG_DIR = process.env.LOG_DIR ?? join(process.env.HOME ?? '.', '.local', 'share', 'kaleb-voice', 'logs');

export interface TurnLog {
  ts: number;                    // Date.now() epoch ms
  sessionId: string;
  role: 'user' | 'assistant';
  text: string;
  latency: {
    asrMs: number | null;        // speech_started -> onTranscriptFinal
    llmTtftMs: number | null;    // streamLlmResponse call -> first onChunk
    ttsTtfaMs: number | null;    // TTS WS open -> first onAudioDelta
    totalMs: number | null;      // turnStart -> onDone
  };
}

export function initLogDir(): void {
  mkdirSync(LOG_DIR, { recursive: true });
}

export function logTurn(entry: TurnLog): void {
  Promise.resolve()
    .then(() => {
      appendFileSync(join(LOG_DIR, `${entry.sessionId}.ndjson`), JSON.stringify(entry) + '\n');
    })
    .catch((err) => {
      console.error('[logger] write failed:', err);
    });
}
