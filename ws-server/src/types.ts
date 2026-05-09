// Browser -> Server message protocol
export type BrowserMessage =
  | { type: 'audio.append'; data: string }      // base64 PCM16 16kHz mono
  | { type: 'audio.end' }                        // release push-to-talk and commit ASR buffer
  | { type: 'session.start' }                    // initialize/re-initialize DashScope sessions

// Server -> Browser message protocol
export type ServerMessage =
  | { type: 'session.ready' }                    // server ready for audio
  | { type: 'transcript.partial'; text: string } // interim ASR result
  | { type: 'transcript.final'; text: string }   // final ASR result
  | { type: 'response.audio.delta'; delta: string } // base64 PCM 24kHz chunk
  | { type: 'response.text.delta'; delta: string }  // LLM text chunk for transcript display
  | { type: 'response.done'; immediate?: boolean } // TTS finished; immediate=true means barge-in (stop audio now)
  | { type: 'grid.transmitted'; grid: string }   // 6-digit MGRS extracted from a hidden <grid>NNNNNN</grid> tag in LLM stream
  | { type: 'error'; message: string }           // error from any pipeline stage

export function isValidBrowserMessage(msg: unknown): msg is BrowserMessage {
  if (typeof msg !== 'object' || msg === null || !('type' in msg)) return false;
  const m = msg as { type: string };
  return ['audio.append', 'audio.end', 'session.start'].includes(m.type);
}
