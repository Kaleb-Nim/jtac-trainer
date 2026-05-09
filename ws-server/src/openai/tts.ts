// OpenAI Realtime voice adapter.
// Uses gpt-realtime-2 to render already-generated pilot text into 24 kHz PCM.

const REALTIME_MODEL = process.env.OPENAI_REALTIME_VOICE_MODEL || 'gpt-realtime-2';
const REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE || 'marin';
const REALTIME_VOICE_ID = process.env.OPENAI_REALTIME_VOICE_ID;
const REALTIME_WS_URL = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(REALTIME_MODEL)}`;

const REALTIME_VOICE_CONFIG = REALTIME_VOICE_ID ? { id: REALTIME_VOICE_ID } : REALTIME_VOICE;

export interface TtsCallbacks {
  onAudioDelta: (base64Audio: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export interface TtsHandle {
  ws: WebSocket;
  callbacks: TtsCallbacks;
  queue: string[];
  speaking: boolean;
  finishing: boolean;
  closed: boolean;
}

function requireOpenAiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  return apiKey;
}

function sendJson(ws: WebSocket, value: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(value));
  }
}

function buildSpeechInstructions(text: string): string {
  return [
    'You are rendering the A-10 pilot voice for a JTAC simulator.',
    'Speak the supplied pilot line exactly. Do not add words, omit words, paraphrase, explain, or mention these instructions.',
    'Use a concise military radio delivery: calm, clear, clipped, and natural.',
    '',
    'Pilot line:',
    text,
  ].join('\n');
}

function finalizeIfDone(handle: TtsHandle): void {
  if (!handle.finishing || handle.speaking || handle.queue.length > 0 || handle.closed) return;
  handle.closed = true;
  handle.callbacks.onDone();
  handle.ws.close();
}

function speakNext(handle: TtsHandle): void {
  if (handle.closed || handle.speaking || handle.ws.readyState !== WebSocket.OPEN) return;

  const text = handle.queue.shift();
  if (!text) {
    finalizeIfDone(handle);
    return;
  }

  handle.speaking = true;
  sendJson(handle.ws, {
    type: 'response.create',
    response: {
      conversation: 'none',
      metadata: { kind: 'tts' },
      output_modalities: ['audio'],
      audio: {
        output: {
          format: { type: 'audio/pcm', rate: 24000 },
        },
      },
      instructions: buildSpeechInstructions(text),
    },
  });
}

export function createTtsSession(callbacks: TtsCallbacks): Promise<TtsHandle> {
  let apiKey: string;
  try {
    apiKey = requireOpenAiKey();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    callbacks.onError(message);
    return Promise.reject(err);
  }

  return new Promise<TtsHandle>((resolve, reject) => {
    let resolved = false;
    const handle: TtsHandle = {
      ws: null as unknown as WebSocket,
      callbacks,
      queue: [],
      speaking: false,
      finishing: false,
      closed: false,
    };

    const ws = new WebSocket(REALTIME_WS_URL, {
      // @ts-expect-error Bun's WebSocket constructor accepts headers as second arg.
      headers: {
        Authorization: 'Bearer ' + apiKey,
      },
    });
    handle.ws = ws;

    ws.onopen = () => {
      sendJson(ws, {
        type: 'session.update',
        session: {
          type: 'realtime',
          model: REALTIME_MODEL,
          output_modalities: ['audio'],
          instructions:
            'You render supplied pilot text as speech. Speak exactly the provided line and do not continue the conversation.',
          audio: {
            input: {
              format: { type: 'audio/pcm', rate: 24000 },
              turn_detection: null,
            },
            output: {
              format: { type: 'audio/pcm', rate: 24000 },
              voice: REALTIME_VOICE_CONFIG,
            },
          },
        },
      });
    };

    ws.onmessage = (event) => {
      let msg: { type: string; delta?: string; error?: { message?: string }; [key: string]: unknown };
      try {
        msg = JSON.parse(typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data as ArrayBuffer));
      } catch {
        callbacks.onError('OpenAI TTS: failed to parse message');
        return;
      }

      switch (msg.type) {
        case 'session.updated':
          if (!resolved) {
            resolved = true;
            resolve(handle);
          }
          break;

        case 'response.audio.delta':
        case 'response.output_audio.delta':
          if (msg.delta) callbacks.onAudioDelta(msg.delta);
          break;

        case 'response.done':
          handle.speaking = false;
          speakNext(handle);
          finalizeIfDone(handle);
          break;

        case 'error':
          {
            const message = msg.error?.message ?? 'OpenAI TTS error';
            callbacks.onError(message);
            if (!resolved) {
              resolved = true;
              reject(new Error(message));
            }
          }
          break;

        default:
          break;
      }
    };

    ws.onclose = () => {
      handle.closed = true;
      console.log('[tts] OpenAI Realtime WebSocket closed');
    };

    ws.onerror = () => {
      const err = new Error('OpenAI TTS WebSocket connection error');
      callbacks.onError(err.message);
      reject(err);
    };
  });
}

export function appendTextToTts(handle: TtsHandle, text: string): void {
  if (handle.closed) return;
  const trimmed = text.trim();
  if (!trimmed) return;

  handle.queue.push(trimmed);
  speakNext(handle);
}

export function finishTtsSession(handle: TtsHandle): void {
  if (handle.closed) return;
  handle.finishing = true;
  finalizeIfDone(handle);
}

export function cancelTtsSession(handle: TtsHandle): void {
  if (handle.closed) return;
  handle.closed = true;
  sendJson(handle.ws, { type: 'response.cancel' });
  handle.ws.close();
}
