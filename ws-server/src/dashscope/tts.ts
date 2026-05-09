// DashScope TTS WebSocket client
// Connects to Qwen3-TTS in server_commit mode using a Qwen-provided persona voice
// (e.g. "Ethan"). The DASHSCOPE_API_KEY is read from process.env, and the persona
// voice id is read from DASHSCOPE_VOICE_ID with a default of "Ethan" (male English,
// fits the JTAC pilot character). Env-only config — never set from browser messages
// (security: T-02-08).

const TTS_WS_URL =
  'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=qwen3-tts-vc-realtime-2026-01-15';

export interface TtsCallbacks {
  onAudioDelta: (base64Audio: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

/**
 * Wraps the TTS WebSocket with a `finishing` flag so callers can distinguish
 * intermediate response.done (from server_commit segments) from the final one.
 */
export interface TtsHandle {
  ws: WebSocket;
  /** Set to true once finishTtsSession() is called — only then is response.done final */
  finishing: boolean;
}

/**
 * Open a DashScope TTS WebSocket session in server_commit mode.
 * Sends session.update on open with the configured persona voice (default "Ethan").
 * Routes incoming messages to callbacks.
 * Returns a promise that resolves with a TtsHandle once the connection is open
 * and the session.update has been sent.
 *
 * IMPORTANT: In server_commit mode the server sends response.done after each
 * auto-committed segment. The onDone callback only fires after session.finish
 * has been sent (i.e. handle.finishing === true) to avoid cutting playback short.
 */
export function createTtsSession(callbacks: TtsCallbacks): Promise<TtsHandle> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  // Qwen3-TTS persona voice (e.g. Ethan, Dylan, Cherry, Chelsie, Serena).
  // Defaults to "Ethan" — male English voice that suits the JTAC pilot persona.
  const voiceId = process.env.DASHSCOPE_VOICE_ID || 'Ethan';

  if (!apiKey) {
    callbacks.onError('DASHSCOPE_API_KEY is not set');
    return Promise.reject(new Error('DASHSCOPE_API_KEY is not set'));
  }

  return new Promise<TtsHandle>((resolve, reject) => {
    const handle: TtsHandle = { ws: null as unknown as WebSocket, finishing: false };

    const ws = new WebSocket(TTS_WS_URL, {
      // @ts-expect-error — Bun's WebSocket constructor accepts headers as second arg
      headers: {
        Authorization: 'Bearer ' + apiKey,
      },
    });

    handle.ws = ws;

    ws.onopen = () => {
      // Initialize TTS session with server_commit mode and the persona voice
      ws.send(
        JSON.stringify({
          type: 'session.update',
          event_id: 'evt_tts_init',
          session: {
            mode: 'server_commit',
            voice: voiceId,
            language_type: 'en',
            response_format: 'pcm',
            sample_rate: 24000,
          },
        })
      );
      resolve(handle);
    };

    ws.onmessage = (event) => {
      let msg: { type: string; delta?: string; error?: { message?: string }; [key: string]: unknown };
      try {
        msg = JSON.parse(
          typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data as ArrayBuffer)
        );
      } catch {
        callbacks.onError('TTS: failed to parse message');
        return;
      }

      switch (msg.type) {
        case 'response.audio.delta':
          if (msg.delta) callbacks.onAudioDelta(msg.delta);
          break;

        case 'response.done':
          // In server_commit mode the server sends response.done per segment.
          // Only treat it as truly done after we've sent session.finish.
          if (handle.finishing) {
            callbacks.onDone();
          }
          break;

        case 'error':
          callbacks.onError(msg.error?.message ?? 'TTS error');
          break;

        default:
          // Other events (session.created, session.updated, etc.) — ignore silently
          break;
      }
    };

    ws.onclose = () => {
      console.log('[tts] WebSocket closed');
    };

    ws.onerror = () => {
      callbacks.onError('TTS WebSocket connection error');
      reject(new Error('TTS WebSocket connection error'));
    };
  });
}

/**
 * Append a text chunk to the TTS session for synthesis.
 * Only sends if the WebSocket is in the OPEN state.
 */
export function appendTextToTts(handle: TtsHandle, text: string): void {
  if (handle.ws.readyState !== WebSocket.OPEN) return;

  handle.ws.send(
    JSON.stringify({
      type: 'input_text_buffer.append',
      event_id: 'evt_tts_' + Date.now(),
      text,
    })
  );
}

/**
 * Signal the TTS session that all text has been appended.
 * Sets handle.finishing so the next response.done is treated as final.
 */
export function finishTtsSession(handle: TtsHandle): void {
  if (handle.ws.readyState !== WebSocket.OPEN) return;

  handle.finishing = true;
  handle.ws.send(
    JSON.stringify({
      type: 'session.finish',
      event_id: 'evt_tts_finish',
    })
  );
}
