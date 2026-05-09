import type { ServerWebSocket } from 'bun';
import type { ServerMessage } from './types';
import type { TtsHandle } from './dashscope/tts';
import { createAsrSession, forwardAudioToAsr } from './dashscope/asr';
import { streamLlmResponse } from './dashscope/llm';
import { createTtsSession, appendTextToTts, finishTtsSession } from './dashscope/tts';
import { logTurn } from './logger';
import type { TurnLog } from './logger';

// Per-session data stored in Bun's WebSocket data slot
export type SessionData = {
  sessionId: string;
  session: Session | null;
};

// Max conversation history entries (10 user + 10 assistant turns)
const MAX_HISTORY_ENTRIES = 20;

export class Session {
  readonly sessionId: string;
  asrWs: WebSocket | null = null;
  ttsHandle: TtsHandle | null = null;
  isActive: boolean = true;

  /** Conversation history for multi-turn context — capped at 20 entries (T-02-07) */
  conversationHistory: Array<{ role: string; content: string }> = [];

  /** AbortController for the current LLM+TTS pipeline — aborted on barge-in */
  private responseAbort: AbortController | null = null;

  private ws: ServerWebSocket<SessionData>;

  constructor(ws: ServerWebSocket<SessionData>) {
    this.ws = ws;
    this.sessionId = ws.data.sessionId;
  }

  /** Cancel any in-flight LLM+TTS response (barge-in) */
  private cancelCurrentResponse(): void {
    if (this.responseAbort) {
      this.responseAbort.abort();
      this.responseAbort = null;
    }
    if (this.ttsHandle && this.ttsHandle.ws.readyState === WebSocket.OPEN) {
      finishTtsSession(this.ttsHandle);
    }
    this.ttsHandle = null;
  }

  /** Send a typed message to the browser client */
  send(msg: ServerMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  /**
   * Run the LLM→TTS pipeline for a given user message (or greeting prompt).
   * Reused by both transcript handling and the proactive greeting.
   */
  private startResponse(userText: string, opts?: { isGreeting?: boolean; bargeInPrefix?: string; asrDurationMs?: number | null }): void {
    const session = this;
    const isGreeting = opts?.isGreeting ?? false;

    // Cancel any in-flight response
    session.cancelCurrentResponse();
    if (!isGreeting) {
      session.send({ type: 'response.done', immediate: true }); // barge-in: stop old audio immediately
    }

    // Create new abort controller for this response turn
    const abort = new AbortController();
    session.responseAbort = abort;

    // ── Latency tracking (closure-scoped per turn) ──────────────────────
    const turnStart = performance.now();
    let llmTtftMs: number | null = null;
    let ttsTtfaMs: number | null = null;
    let ttsOpenTime: number | null = null;
    let firstLlmChunk = true;
    let firstTtsAudio = true;

    // Add user turn to conversation history (skip for greeting — no user message)
    if (!isGreeting) {
      session.conversationHistory.push({ role: 'user', content: userText });
      while (session.conversationHistory.length > MAX_HISTORY_ENTRIES) {
        session.conversationHistory.shift();
        session.conversationHistory.shift();
      }
    }

    // Accumulate assistant response for history
    let assistantResponse = '';

    // Per-turn buffer for <grid>NNNNNN</grid> tag extraction (Phase 3 / PILOT-04).
    // Tags must be stripped from TTS, response.text.delta, and assistantResponse so
    // the JTAC never hears or sees them — they're machine-only signals to the client.
    let pendingText = '';
    const GRID_RE = /<grid>(\d{6})<\/grid>/;

    // Open TTS session — promise resolves once WS is open
    const ttsReadyPromise = createTtsSession({
      onAudioDelta: (delta) => {
        if (firstTtsAudio) {
          ttsTtfaMs = Math.round(performance.now() - (ttsOpenTime ?? turnStart));
          firstTtsAudio = false;
        }
        session.send({ type: 'response.audio.delta', delta });
      },
      onDone: () => {
        if (abort.signal.aborted) return; // don't log aborted turns
        const totalMs = Math.round(performance.now() - turnStart);
        logTurn({
          ts: Date.now(),
          sessionId: session.sessionId,
          role: 'assistant',
          text: isGreeting ? '[greeting]' : assistantResponse,
          latency: {
            asrMs: opts?.asrDurationMs ?? null,
            llmTtftMs,
            ttsTtfaMs,
            totalMs,
          },
        });
        session.send({ type: 'response.done' });
        session.ttsHandle = null;
      },
      onError: (message) => {
        session.send({ type: 'error', message });
      },
    });

    // Store handle once resolved (for barge-in cleanup)
    ttsReadyPromise.then((handle) => { session.ttsHandle = handle; });

    // Start LLM streaming once TTS WebSocket is open
    ttsReadyPromise.then((handle) => {
      ttsOpenTime = performance.now();
      // For greeting, use a special internal prompt; for normal, use transcript
      const prompt = isGreeting
        ? '[GREETING] The visitor just activated the voice interface. Greet them.'
        : userText;

      // Helper: forward a clean (tag-stripped) text fragment to TTS, client text
      // stream, and history accumulator. Empty strings are no-ops.
      const flushClean = (text: string) => {
        if (!text) return;
        appendTextToTts(handle, text);
        session.send({ type: 'response.text.delta', delta: text });
        assistantResponse += text;
      };

      streamLlmResponse(
        prompt,
        session.conversationHistory.slice(),
        (chunk) => {
          if (abort.signal.aborted) return;
          if (firstLlmChunk) {
            llmTtftMs = Math.round(performance.now() - (ttsOpenTime ?? turnStart));
            firstLlmChunk = false;
          }
          pendingText += chunk;

          // Drain all complete <grid>NNNNNN</grid> matches from the buffer. Text
          // before each match is flushed clean; the tag itself becomes a
          // grid.transmitted server message and is dropped from the user-visible
          // streams.
          let match: RegExpExecArray | null;
          while ((match = GRID_RE.exec(pendingText)) !== null) {
            const grid = match[1];
            const before = pendingText.slice(0, match.index);
            const after = pendingText.slice(match.index + match[0].length);
            flushClean(before);
            session.send({ type: 'grid.transmitted', grid });
            pendingText = after;
          }

          // Hold back any tail starting at the FIRST unmatched '<' in case it's
          // the start of a tag split across the next chunk; flush everything
          // before it. Using indexOf (not lastIndexOf) is critical: with a tag
          // like '<grid>599699</gri...' the open '<grid>' must be preserved
          // until the closing '</grid>' arrives — lastIndexOf would point at
          // the '</' and leak the '<grid>NNNNNN' prefix to TTS.
          const firstLt = pendingText.indexOf('<');
          if (firstLt === -1) {
            flushClean(pendingText);
            pendingText = '';
          } else {
            flushClean(pendingText.slice(0, firstLt));
            pendingText = pendingText.slice(firstLt);
          }
        },
        () => {
          if (abort.signal.aborted) return;
          // Final scan: any complete tag that arrived as the last chunk's tail
          // is extracted now; remaining text (including incomplete '<...' that
          // never closed) is flushed verbatim so the client doesn't lose words.
          let m: RegExpExecArray | null;
          while ((m = GRID_RE.exec(pendingText)) !== null) {
            const g = m[1];
            const before = pendingText.slice(0, m.index);
            const after = pendingText.slice(m.index + m[0].length);
            flushClean(before);
            session.send({ type: 'grid.transmitted', grid: g });
            pendingText = after;
          }
          flushClean(pendingText);
          pendingText = '';

          finishTtsSession(handle);
          if (assistantResponse) {
            session.conversationHistory.push({ role: 'assistant', content: assistantResponse });
            while (session.conversationHistory.length > MAX_HISTORY_ENTRIES) {
              session.conversationHistory.shift();
              session.conversationHistory.shift();
            }
          }
        },
        (message) => {
          if (abort.signal.aborted) return;
          session.send({ type: 'error', message });
        },
        abort.signal,
        opts?.bargeInPrefix
      );
    }).catch((err) => {
      console.error('[session] TTS failed to open:', err);
    });
  }

  /** Start the ASR pipeline and signal session.ready to browser once ASR is open */
  startPipeline(): void {
    if (this.asrWs && this.asrWs.readyState === WebSocket.OPEN) {
      // Already running — re-signal ready
      this.send({ type: 'session.ready' });
      return;
    }

    const session = this;
    let asrSpeechStart: number | null = null;

    createAsrSession({
      onSpeechStarted: () => {
        asrSpeechStart = performance.now();
      },
      onTranscriptPartial: (text) => {
        session.send({ type: 'transcript.partial', text });
      },
      onTranscriptFinal: (text) => {
        // Compute ASR duration
        const asrDurationMs = asrSpeechStart !== null
          ? Math.round(performance.now() - asrSpeechStart)
          : null;
        asrSpeechStart = null; // reset for next turn

        session.send({ type: 'transcript.final', text });
        console.log(`[session] ${session.sessionId} transcript: ${text}`);

        // ── Guard: skip empty or filler utterances (D-05) ──
        if (!text.trim()) return;
        const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount < 3) {
          console.log(`[session] ignoring short transcript (${wordCount} words): "${text}"`);
          return;
        }

        // Log user turn (fire-and-forget)
        logTurn({
          ts: Date.now(),
          sessionId: session.sessionId,
          role: 'user',
          text,
          latency: {
            asrMs: asrDurationMs,
            llmTtftMs: null,
            ttsTtfaMs: null,
            totalMs: null,
          },
        });

        // ── D-06: detect if we're interrupting an in-flight response ──
        const wasResponding = session.responseAbort !== null;
        const bargeInPrefix = wasResponding ? 'Oh sure \u2014 ' : undefined;

        session.startResponse(text, { bargeInPrefix, asrDurationMs });
      },
      onError: (message) => {
        session.send({ type: 'error', message });
      },
    }).then((asrWs) => {
      session.asrWs = asrWs;
      session.send({ type: 'session.ready' });
      console.log(`[session] ${session.sessionId} ASR pipeline ready`);

      // Proactive greeting — AI speaks first when visitor connects
      session.startResponse('', { isGreeting: true });
    }).catch((err) => {
      console.error(`[session] ${session.sessionId} ASR failed to open:`, err);
      session.send({ type: 'error', message: 'ASR connection failed' });
    });
  }

  /** Forward browser audio to the ASR WebSocket */
  handleAudio(base64: string): void {
    if (!this.asrWs) {
      this.send({ type: 'error', message: 'Session not started — send session.start first' });
      return;
    }
    forwardAudioToAsr(this.asrWs, base64);
  }

  /** Close all DashScope WebSockets and mark session inactive */
  cleanup(): void {
    this.isActive = false;

    this.cancelCurrentResponse();

    if (this.asrWs && this.asrWs.readyState === WebSocket.OPEN) {
      this.asrWs.close();
    }
    this.asrWs = null;

    this.conversationHistory = [];

    console.log(`[session] ${this.sessionId} cleaned up`);
  }
}
