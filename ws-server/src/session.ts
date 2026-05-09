import type { ServerWebSocket } from 'bun';
import type { ServerMessage } from './types';
import { transcribeAudioChunks } from './openai/asr';
import { streamLlmResponse, type LlmToolCall } from './dashscope/llm';
import type { TtsHandle } from './openai/tts';
import { appendTextToTts, cancelTtsSession, createTtsSession, finishTtsSession } from './openai/tts';
import { logTurn } from './logger';

// Per-session data stored in Bun's WebSocket data slot
export type SessionData = {
  sessionId: string;
  session: Session | null;
};

// Max conversation history entries (10 user + 10 assistant turns)
const MAX_HISTORY_ENTRIES = 20;
const MIN_TRANSCRIPT_WORDS = Number(process.env.MIN_TRANSCRIPT_WORDS) || 1;

function normalizeSixDigitGrid(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  return /^\d{6}$/.test(digits) ? digits : null;
}

function hasHotClearance(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  return /\bclear(?:ed)?\s+hot\b/.test(normalized);
}

export class Session {
  readonly sessionId: string;
  ttsHandle: TtsHandle | null = null;
  isActive: boolean = true;
  private asrReady = false;
  private audioChunks: string[] = [];

  /** Conversation history for multi-turn context — capped at 20 entries (T-02-07) */
  conversationHistory: Array<{ role: string; content: string }> = [];

  /** Latest line-6 grid the pilot read back. This arms fire-control but does not release. */
  private fireControlGrid: string | null = null;

  /** AbortController for the current LLM+TTS pipeline — aborted on barge-in */
  private responseAbort: AbortController | null = null;

  /** Client push-to-talk turn start, used when ASR runs in manual mode. */
  private manualAudioStart: number | null = null;

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
    if (this.ttsHandle) {
      cancelTtsSession(this.ttsHandle);
    }
    this.ttsHandle = null;
  }

  /** Send a typed message to the browser client */
  send(msg: ServerMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private captureTransmittedGrid(grid: string): void {
    if (!/^\d{6}$/.test(grid)) return;
    this.fireControlGrid = grid;
    this.send({ type: 'grid.transmitted', grid });
  }

  private resolveDropBombGrid(toolCall: LlmToolCall): string | null {
    let requestedGrid: string | null = null;

    try {
      const args = toolCall.arguments ? JSON.parse(toolCall.arguments) : {};
      requestedGrid = normalizeSixDigitGrid((args as { mgrs?: unknown }).mgrs);
    } catch {
      requestedGrid = null;
    }

    if (this.fireControlGrid && requestedGrid && requestedGrid !== this.fireControlGrid) {
      console.warn(
        `[session] ${this.sessionId} drop_bomb requested ${requestedGrid}, using stored JTAC grid ${this.fireControlGrid}`,
      );
    }

    return this.fireControlGrid ?? requestedGrid;
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

    // Open voice session — promise resolves once the Realtime session is updated.
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
        if (session.responseAbort === abort) {
          session.responseAbort = null;
        }
      },
      onError: (message) => {
        session.send({ type: 'error', message });
      },
    });

    // Store handle once resolved (for barge-in cleanup)
    ttsReadyPromise.then((handle) => { session.ttsHandle = handle; });

    // Start LLM streaming once the Realtime voice session is ready.
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
            session.captureTransmittedGrid(grid);
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
            session.captureTransmittedGrid(g);
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
        opts?.bargeInPrefix,
        (toolCall) => {
          if (abort.signal.aborted || toolCall.name !== 'drop_bomb') return;
          if (!hasHotClearance(userText)) {
            console.warn(`[session] ${session.sessionId} drop_bomb ignored: no JTAC cleared-hot transcript`);
            return;
          }
          const grid = session.resolveDropBombGrid(toolCall);
          if (!grid) {
            console.warn(`[session] ${session.sessionId} drop_bomb ignored: no valid JTAC grid`);
            return;
          }
          if (!assistantResponse.trim()) {
            flushClean('hog1, cleared hot. Bombs away.');
          }
          session.send({ type: 'weapon.release', grid });
        }
      );
    }).catch((err) => {
      console.error('[session] TTS failed to open:', err);
      if (session.responseAbort === abort) {
        session.responseAbort = null;
      }
    });
  }

  private handleTranscript(text: string, asrDurationMs: number | null): void {
    const trimmed = text.trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
    const shouldIgnore = wordCount < MIN_TRANSCRIPT_WORDS;

    // Signal readiness after each completed push-to-talk turn. The frontend uses
    // this to permit the next manual recording turn.
    this.asrReady = true;
    this.send({ type: 'session.ready' });

    // ── Guard: skip empty, short, or filler utterances (D-05) ──
    if (shouldIgnore) {
      console.log(`[session] ignoring short transcript (${wordCount} words): "${text}"`);
      this.send({ type: 'transcript.final', text: '' });
      return;
    }

    this.send({ type: 'transcript.final', text });
    console.log(`[session] ${this.sessionId} transcript: ${text}`);

    // Log user turn (fire-and-forget)
    logTurn({
      ts: Date.now(),
      sessionId: this.sessionId,
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
    const wasResponding = this.responseAbort !== null;
    const bargeInPrefix = wasResponding ? 'Oh sure \u2014 ' : undefined;

    this.startResponse(text, { bargeInPrefix, asrDurationMs });
  }

  /** Prepare for manual push-to-talk turns. ASR itself runs after release. */
  private openAsrPipeline(opts?: { greet?: boolean }): void {
    if (this.asrReady) {
      this.send({ type: 'session.ready' });
      return;
    }

    this.asrReady = true;
    this.audioChunks = [];
    this.send({ type: 'session.ready' });
    console.log(`[session] ${this.sessionId} OpenAI ASR pipeline ready`);

    // Proactive greeting — AI speaks first when visitor connects
    if (opts?.greet ?? false) {
      this.startResponse('', { isGreeting: true });
    }
  }

  /** Start the ASR pipeline and signal session.ready to browser once ASR is open */
  startPipeline(): void {
    this.openAsrPipeline({ greet: true });
  }

  /** Buffer browser audio for the current push-to-talk turn. */
  handleAudio(base64: string): void {
    if (!this.asrReady) {
      this.send({ type: 'error', message: 'Session not started — send session.start first' });
      return;
    }
    this.manualAudioStart ??= performance.now();
    this.audioChunks.push(base64);
  }

  /** Transcribe the currently buffered push-to-talk turn. */
  async handleAudioEnd(): Promise<void> {
    if (!this.asrReady) {
      this.send({ type: 'error', message: 'Session not started — send session.start first' });
      return;
    }

    this.asrReady = false;
    const chunks = this.audioChunks;
    this.audioChunks = [];
    const turnStart = this.manualAudioStart;
    this.manualAudioStart = null;

    if (chunks.length === 0) {
      this.handleTranscript('', null);
      return;
    }

    try {
      const text = await transcribeAudioChunks(chunks);
      if (!this.isActive) return;
      const asrDurationMs = turnStart !== null ? Math.round(performance.now() - turnStart) : null;
      this.handleTranscript(text, asrDurationMs);
    } catch (err) {
      if (!this.isActive) return;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[session] ${this.sessionId} ASR transcription failed:`, err);
      this.asrReady = true;
      this.send({ type: 'session.ready' });
      this.send({ type: 'error', message });
    }
  }

  /** Close all provider resources and mark session inactive. */
  cleanup(): void {
    this.isActive = false;

    this.cancelCurrentResponse();

    this.asrReady = false;
    this.audioChunks = [];

    this.conversationHistory = [];
    this.fireControlGrid = null;

    console.log(`[session] ${this.sessionId} cleaned up`);
  }
}
