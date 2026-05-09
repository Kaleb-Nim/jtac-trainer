// DashScope ASR WebSocket client
// Connects to Qwen3-ASR via server-side WebSocket.
// The DASHSCOPE_API_KEY is read from process.env and never sent to the browser.

const ASR_WS_URL =
  'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=qwen3-asr-flash-realtime';

export interface AsrCallbacks {
  onTranscriptPartial: (text: string) => void;
  onTranscriptFinal: (text: string) => void;
  onSpeechStarted?: () => void;   // fires on input_audio_buffer.speech_started
  onSessionFinished?: () => void;
  onError: (message: string) => void;
}

/**
 * Open a DashScope ASR WebSocket session.
 * Sends session.update on open, then routes incoming messages to callbacks.
 * Returns a promise that resolves with the WebSocket once the connection is open
 * and session.update has been sent.
 */
export function createAsrSession(callbacks: AsrCallbacks): Promise<WebSocket> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    callbacks.onError('DASHSCOPE_API_KEY is not set');
    return Promise.reject(new Error('DASHSCOPE_API_KEY is not set'));
  }

  return new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(ASR_WS_URL, {
      // @ts-expect-error — Bun's WebSocket constructor accepts headers as second arg
      headers: {
        Authorization: 'Bearer ' + apiKey,
      },
    });

    ws.onopen = () => {
      // Initialize ASR session with PCM 16kHz mono config and manual turns.
      // Browser audio is only forwarded while push-to-talk is held; release
      // sends input_audio_buffer.commit via commitAudioBuffer().
      ws.send(
        JSON.stringify({
          type: 'session.update',
          event_id: 'evt_asr_init',
          session: {
            modalities: ['text'],
            input_audio_format: 'pcm',
            sample_rate: 16000,
            input_audio_transcription: { language: 'en' },
            turn_detection: null,
          },
        })
      );
      resolve(ws);
    };

    ws.onmessage = (event) => {
      let msg: { type: string; [key: string]: unknown };
      try {
        msg = JSON.parse(typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data as ArrayBuffer));
      } catch {
        callbacks.onError('ASR: failed to parse message');
        return;
      }

      switch (msg.type) {
        case 'conversation.item.input_audio_transcription.completed': {
          const transcript = (msg.transcript as string | undefined) ?? '';
          callbacks.onTranscriptFinal(transcript);
          break;
        }

        case 'conversation.item.input_audio_transcription.text': {
          const text = (msg.text as string | undefined) ?? '';
          const stash = (msg.stash as string | undefined) ?? '';
          callbacks.onTranscriptPartial(text + stash);
          break;
        }

        case 'conversation.item.input_audio_transcription.failed': {
          const errMsg = (msg.error as { message?: string } | undefined)?.message ?? 'ASR transcription failed';
          callbacks.onError(errMsg);
          break;
        }

        case 'session.finished':
          callbacks.onSessionFinished?.();
          break;

        case 'input_audio_buffer.speech_started':
          console.log('[asr] speech started');
          callbacks.onSpeechStarted?.();
          break;

        case 'error': {
          const errMsg = (msg.error as { message?: string } | undefined)?.message ?? 'ASR error';
          callbacks.onError(errMsg);
          break;
        }

        default:
          // Other events (session.updated, session.created, etc.) — ignore silently
          break;
      }
    };

    ws.onclose = () => {
      console.log('[asr] WebSocket closed');
    };

    ws.onerror = () => {
      callbacks.onError('ASR WebSocket connection error');
      reject(new Error('ASR WebSocket connection error'));
    };
  });
}

/**
 * Forward a base64-encoded PCM16 16kHz audio chunk to the ASR WebSocket.
 * Only sends if the WebSocket is in the OPEN state.
 */
export function forwardAudioToAsr(asrWs: WebSocket, base64Audio: string): void {
  if (asrWs.readyState !== WebSocket.OPEN) return;

  asrWs.send(
    JSON.stringify({
      type: 'input_audio_buffer.append',
      event_id: 'evt_audio_' + Date.now(),
      audio: base64Audio,
    })
  );
}

/** Commit the current manual ASR audio buffer and request transcription. */
export function commitAudioBuffer(asrWs: WebSocket): void {
  if (asrWs.readyState !== WebSocket.OPEN) return;

  asrWs.send(
    JSON.stringify({
      type: 'input_audio_buffer.commit',
      event_id: 'evt_commit_' + Date.now(),
    })
  );
}

/** Finish the current ASR session after a manual commit has been sent. */
export function finishAsrSession(asrWs: WebSocket): void {
  if (asrWs.readyState !== WebSocket.OPEN) return;

  asrWs.send(
    JSON.stringify({
      type: 'session.finish',
      event_id: 'evt_finish_' + Date.now(),
    })
  );
}
