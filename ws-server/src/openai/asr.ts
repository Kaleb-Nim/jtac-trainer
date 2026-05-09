// OpenAI speech-to-text adapter.
// Browser audio arrives as base64 PCM16 chunks; on push-to-talk release we wrap
// the buffered PCM in a WAV container and transcribe it with gpt-4o-transcribe.

import OpenAI, { toFile } from 'openai';

const TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-transcribe';
const TRANSCRIPTION_LANGUAGE = process.env.OPENAI_TRANSCRIBE_LANGUAGE || 'en';
const TRANSCRIPTION_PROMPT =
  process.env.OPENAI_TRANSCRIBE_PROMPT ||
  'JTAC close air support radio transmission. Preserve six digit grids, callsigns, headings, distances, elevations, and clearance phrases such as cleared hot.';

export const ASR_SAMPLE_RATE = 24000;

function getOpenAiClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey });
}

function base64ChunksToPcm(chunks: string[]): Uint8Array {
  const buffers = chunks.map((chunk) => Buffer.from(chunk, 'base64'));
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  const out = new Uint8Array(totalLength);
  let offset = 0;

  for (const buffer of buffers) {
    out.set(buffer, offset);
    offset += buffer.byteLength;
  }

  return out;
}

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function pcm16ToWav(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const headerSize = 44;
  const bytesPerSample = 2;
  const channels = 1;
  const wav = new Uint8Array(headerSize + pcm.byteLength);
  const view = new DataView(wav.buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  wav.set(pcm, headerSize);

  return wav;
}

export async function transcribeAudioChunks(base64Chunks: string[]): Promise<string> {
  if (base64Chunks.length === 0) return '';

  const pcm = base64ChunksToPcm(base64Chunks);
  if (pcm.byteLength === 0) return '';

  const client = getOpenAiClient();
  const wav = pcm16ToWav(pcm, ASR_SAMPLE_RATE);
  const file = await toFile(wav, 'jtac-transmission.wav', { type: 'audio/wav' });
  const transcription = await client.audio.transcriptions.create({
    file,
    model: TRANSCRIPTION_MODEL,
    language: TRANSCRIPTION_LANGUAGE,
    prompt: TRANSCRIPTION_PROMPT,
  });

  return typeof transcription === 'string' ? transcription : transcription.text ?? '';
}
