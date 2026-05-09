'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';

export type RealtimePhase = 'idle' | 'connecting' | 'listening' | 'responding' | 'error';

export interface RealtimeStatus {
  phase: RealtimePhase;
  transcript: string;
  responseText: string;
  error: string | null;
}

const WS_SERVER_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080/ws';

// Audio sample rates
const MIC_SAMPLE_RATE = 16000;     // ASR requires 16kHz mono PCM
const PLAYBACK_SAMPLE_RATE = 24000; // TTS returns 24kHz PCM

// ── Audio utility functions ────────────────────────────────────────────────

function pcm16ToFloat32(pcm: ArrayBuffer): Float32Array<ArrayBuffer> {
  const int16 = new Int16Array(pcm);
  const float32 = new Float32Array(int16.length) as Float32Array<ArrayBuffer>;
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

function float32ToPcm16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 32768 : s * 32767;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Downsample from srcRate to MIC_SAMPLE_RATE (16kHz)
function downsample(float32: Float32Array, srcRate: number): Float32Array {
  if (srcRate === MIC_SAMPLE_RATE) return float32;
  const ratio = srcRate / MIC_SAMPLE_RATE;
  const outLen = Math.floor(float32.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    out[i] = float32[Math.floor(i * ratio)];
  }
  return out;
}

// Fire-and-forget analytics POST. Must NEVER throw into the voice pipeline.
function postAnalytics(path: string, body: unknown) {
  fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

// Maps getUserMedia DOMException names to user-friendly messages
function getUserMediaErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
        return 'Microphone blocked. Tap the lock icon in your browser address bar to allow microphone access, then try again.';
      case 'NotFoundError':
        return 'No microphone found. Please connect a microphone and try again.';
      case 'NotReadableError':
        return 'Microphone is in use by another application. Close other apps using the mic and try again.';
      default:
        return `Microphone error: ${err.message}`;
    }
  }
  return `Microphone error: ${err instanceof Error ? err.message : String(err)}`;
}

export function useRealtimeVoice() {
  const [status, setStatus] = useState<RealtimeStatus>({
    phase: 'idle',
    transcript: '',
    responseText: '',
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  // Separate AudioContexts: one for mic capture (16kHz), one for playback (24kHz)
  const audioCtxRef = useRef<AudioContext | null>(null);       // mic capture
  const playbackCtxRef = useRef<AudioContext | null>(null);    // TTS playback
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // Next scheduled playback time for gapless audio
  const nextPlayTimeRef = useRef<number>(0);
  const lastSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playGenRef = useRef<number>(0);

  // Auto-reconnect state
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);
  const connectingRef = useRef(false);
  const sessionReadyRef = useRef(false);

  // Analytics session tracking
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(0);
  const turnIndexRef = useRef(0);
  const assistantBufferRef = useRef('');

  const setPhase = useCallback((phase: RealtimePhase, extra?: Partial<RealtimeStatus>) => {
    setStatus(prev => ({ ...prev, phase, error: null, ...extra }));
  }, []);

  const sendEvent = useCallback((event: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  // Schedule a PCM16 audio chunk for seamless playback using the playback context
  const scheduleAudioChunk = useCallback((pcm: ArrayBuffer, gen: number) => {
    if (gen !== playGenRef.current) return;
    const ctx = playbackCtxRef.current;
    if (!ctx) return;

    const float32 = pcm16ToFloat32(pcm);
    const buffer = ctx.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;
    lastSourceRef.current = source;
  }, []);

  // Clean up mic and audio resources (called on disconnect and before reconnect)
  const cleanupAudio = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;

    analyserRef.current?.disconnect();
    analyserRef.current = null;

    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;

    audioCtxRef.current?.close();
    audioCtxRef.current = null;

    playbackCtxRef.current?.close();
    playbackCtxRef.current = null;

    lastSourceRef.current = null;
  }, []);

  const handleMessage = useCallback((raw: string) => {
    let event: { type: string; [key: string]: unknown };
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }

    switch (event.type) {
      case 'session.ready': {
        sessionReadyRef.current = true;
        setPhase('listening');
        break;
      }

      case 'transcript.partial': {
        const text = (event.text as string | undefined) ?? '';
        setStatus(prev => ({ ...prev, transcript: text }));
        break;
      }

      case 'transcript.final': {
        const text = (event.text as string | undefined) ?? '';
        setStatus(prev => ({ ...prev, transcript: text }));
        if (sessionIdRef.current && text) {
          postAnalytics('/api/analytics/transcript', {
            sessionId: sessionIdRef.current,
            role: 'user',
            text,
            turnIndex: turnIndexRef.current++,
          });
        }
        if (text) {
          useStore.getState().appendTurn({ role: 'user', text, ts: Date.now() });
        }
        break;
      }

      case 'response.audio.delta': {
        const delta = event.delta as string | undefined;
        if (delta) {
          const pcm = base64ToArrayBuffer(delta);
          scheduleAudioChunk(pcm, playGenRef.current);
          setStatus(prev =>
            prev.phase !== 'responding' ? { ...prev, phase: 'responding' } : prev
          );
        }
        break;
      }

      case 'response.text.delta': {
        const delta = event.delta as string | undefined;
        if (delta) {
          assistantBufferRef.current += delta;
          setStatus(prev => ({ ...prev, responseText: prev.responseText + delta }));
        }
        break;
      }

      case 'response.done': {
        const isImmediate = (event.immediate as boolean | undefined) ?? false;
        const buffered = assistantBufferRef.current;
        assistantBufferRef.current = ''; // clear ref atomically before any async work
        if (!isImmediate && sessionIdRef.current && buffered) {
          postAnalytics('/api/analytics/transcript', {
            sessionId: sessionIdRef.current,
            role: 'assistant',
            text: buffered,
            turnIndex: turnIndexRef.current++,
          });
        }
        if (!isImmediate && buffered) {
          useStore.getState().appendTurn({ role: 'pilot', text: buffered, ts: Date.now() });
        }

        setPhase('listening');

        const ctx = playbackCtxRef.current;
        const gen = playGenRef.current;

        if (ctx) {
          if (isImmediate) {
            // Barge-in: clear text, stop audio, create fresh context
            setStatus(prev => ({ ...prev, responseText: '' }));
            ctx.close();
            const newCtx = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
            newCtx.resume(); // Prevent suspended state on mobile
            playbackCtxRef.current = newCtx;
            nextPlayTimeRef.current = newCtx.currentTime;  // BUG-02 fix: was 0
            playGenRef.current++;                           // BUG-02 fix: invalidate stale deltas
            lastSourceRef.current = null;
          } else {
            // Normal end: wait for last audio chunk to finish playing (BUG-01 fix)
            const lastSource = lastSourceRef.current;
            const drain = () => {
              if (playbackCtxRef.current === ctx && playGenRef.current === gen) {
                setStatus(prev => ({ ...prev, responseText: '' }));
                ctx.close();
                const newCtx = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
                newCtx.resume(); // Prevent suspended state on mobile
                playbackCtxRef.current = newCtx;
                nextPlayTimeRef.current = newCtx.currentTime;
              }
            };

            if (lastSource) {
              lastSource.onended = drain;
            } else {
              drain();
            }
            lastSourceRef.current = null;
          }
        }
        break;
      }

      case 'grid.transmitted': {
        // Phase 3 / PILOT-04: ws-server extracted a <grid>NNNNNN</grid> tag
        // from the LLM response stream. Validate 6 digits and write to the
        // Zustand store; BombImpact subscribes and animates the impact.
        const grid = (event as { grid?: string }).grid;
        if (grid && /^\d{6}$/.test(grid)) {
          useStore.getState().setTransmittedGrid(grid);
        }
        break;
      }

      case 'error': {
        const msg = (event.message as string | undefined) ?? 'Unknown error from server';
        setStatus(prev => ({ ...prev, phase: 'error', error: msg }));
        // Suppress auto-reconnect so onclose does not spawn a replacement session row
        intentionalCloseRef.current = true;
        const id = sessionIdRef.current;
        sessionIdRef.current = null;
        if (id) {
          postAnalytics('/api/analytics/session', {
            event: 'end',
            sessionId: id,
            durationMs: Date.now() - startedAtRef.current,
            status: 'error',
            errorCode: 'server_error',
            errorMessage: msg,
          });
        }
        break;
      }
    }
  }, [setPhase, scheduleAudioChunk]);

  // Internal connect logic — accepts an already-acquired MediaStream to set up audio and WebSocket.
  // getUserMedia is NOT called here; it must be called in connect() before any setState to stay
  // within the user gesture activation window on mobile (iOS Safari, mobile Chrome).
  const connectInternal = useCallback(async (stream: MediaStream) => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    try {
      micStreamRef.current = stream;

      // Mic capture AudioContext at 16kHz for ASR
      const ctx = new AudioContext({ sampleRate: MIC_SAMPLE_RATE });
      await ctx.resume(); // Ensure not suspended on mobile
      audioCtxRef.current = ctx;

      // Separate playback AudioContext at 24kHz for TTS
      const playbackCtx = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
      await playbackCtx.resume(); // Ensure not suspended on mobile
      playbackCtxRef.current = playbackCtx;
      nextPlayTimeRef.current = playbackCtx.currentTime;

      const source = ctx.createMediaStreamSource(stream);

      // Analyser for waveform visualisation (connected to mic capture context)
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // ScriptProcessor to capture PCM and send to Bun WS server
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(ctx.destination);
      processorRef.current = processor;

      // 4. Connect to Bun WS server — no subprotocol headers needed
      const ws = new WebSocket(WS_SERVER_URL);
      wsRef.current = ws;

      ws.onmessage = (e) => handleMessage(e.data);

      ws.onerror = () => {
        setStatus(prev => ({ ...prev, phase: 'error', error: 'WebSocket error' }));
      };

      ws.onopen = () => {
        // Reset retry counter and connecting lock on successful connection
        retriesRef.current = 0;
        connectingRef.current = false;
        // Send session.start to initialize DashScope sessions on the server
        ws.send(JSON.stringify({ type: 'session.start' }));

        // Analytics: start session once per user-initiated connect (not per auto-reconnect).
        // sessionIdRef is only cleared by disconnect(), 'error' case, or pagehide/visibilitychange —
        // so a reconnect keeps the same analytics sessionId and doesn't create a new row.
        if (sessionIdRef.current === null) {
          startedAtRef.current = Date.now();
          turnIndexRef.current = 0;
          assistantBufferRef.current = '';
          fetch('/api/analytics/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'start' }),
            keepalive: true,
          })
            .then(r => (r.ok ? r.json() : null))
            .then(j => { if (j?.sessionId) sessionIdRef.current = j.sessionId; })
            .catch(() => {});
        }

        // Wait for server's session.ready before streaming audio — DashScope ASR setup
        // is async on the server; sending audio.append before asrWs is ready triggers
        // "Session not started" errors.
        sessionReadyRef.current = false;
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          if (!sessionReadyRef.current) return;
          const input = e.inputBuffer.getChannelData(0);
          const downsampled = downsample(input, ctx.sampleRate);
          const b64 = float32ToPcm16Base64(downsampled);
          ws.send(JSON.stringify({ type: 'audio.append', data: b64 }));
        };
      };

      ws.onclose = () => {
        wsRef.current = null;

        if (!intentionalCloseRef.current && retriesRef.current < 5) {
          // Exponential backoff reconnect
          const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
          console.log(`[ws] reconnecting in ${delay}ms (attempt ${retriesRef.current + 1}/5)`);

          // Selectively clean up audio contexts and processors but preserve mic stream
          // so reconnect can reuse it without needing a new user gesture
          processorRef.current?.disconnect();
          processorRef.current = null;
          analyserRef.current?.disconnect();
          analyserRef.current = null;
          audioCtxRef.current?.close();
          audioCtxRef.current = null;
          playbackCtxRef.current?.close();
          playbackCtxRef.current = null;
          lastSourceRef.current = null;

          reconnectTimerRef.current = setTimeout(() => {
            retriesRef.current++;
            const existingStream = micStreamRef.current;
            const tracksLive = existingStream?.getTracks().some(t => t.readyState === 'live');
            if (existingStream && tracksLive) {
              // Reuse existing mic stream — no new user gesture required
              connectInternal(existingStream);
            } else {
              // No live mic stream and no user gesture available — cannot call getUserMedia
              micStreamRef.current?.getTracks().forEach(t => t.stop());
              micStreamRef.current = null;
              connectingRef.current = false;
              setStatus(prev => ({
                ...prev,
                phase: 'error',
                error: 'Connection lost. Tap Connect to reconnect.',
              }));
            }
          }, delay);
        } else if (!intentionalCloseRef.current) {
          // Max retries exhausted
          cleanupAudio();
          setStatus(prev => ({
            ...prev,
            phase: 'error',
            error: 'Connection lost. Max reconnect attempts reached.',
          }));
        } else {
          // Intentional close
          cleanupAudio();
          setStatus(prev => ({
            ...prev,
            phase: prev.phase === 'error' ? 'error' : 'idle',
          }));
        }
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({ phase: 'error', transcript: '', responseText: '', error: msg });
      cleanupAudio();
      wsRef.current = null;
      connectingRef.current = false;
    }
  }, [handleMessage, cleanupAudio]);

  const connect = useCallback(async () => {
    if (connectingRef.current) return;
    // Lock immediately to prevent double-tap on mobile spawning parallel connections
    connectingRef.current = true;

    // Tear down any existing connection before starting fresh
    if (wsRef.current) {
      intentionalCloseRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
      cleanupAudio();
    }
    // Reset reconnect state
    retriesRef.current = 0;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    // CRITICAL: getUserMedia MUST be called FIRST, before any setState.
    // Mobile browsers (iOS Safari, mobile Chrome) require this to be in the
    // direct user gesture chain — calling setPhase() before getUserMedia
    // breaks the user activation window on mobile.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const msg = getUserMediaErrorMessage(err);
      setStatus({ phase: 'error', transcript: '', responseText: '', error: msg });
      connectingRef.current = false;
      return;
    }

    // Reset intentionalClose AFTER getUserMedia succeeds and right before connectInternal,
    // so any pending onclose from the old WebSocket doesn't trigger auto-reconnect
    intentionalCloseRef.current = false;

    // NOW safe to update phase — stream is already acquired
    setPhase('connecting');
    // connectInternal will manage connectingRef from here
    connectingRef.current = false;
    await connectInternal(stream);
  }, [connectInternal, setPhase, cleanupAudio]);

  const disconnect = useCallback(() => {
    // Mark as intentional close so auto-reconnect does not trigger
    intentionalCloseRef.current = true;
    connectingRef.current = false;

    // Analytics: end session on intentional disconnect.
    // Clear ref BEFORE posting so a racing visibilitychange/pagehide cannot
    // issue a second end beacon for the same session id.
    const analyticsId = sessionIdRef.current;
    sessionIdRef.current = null;
    if (analyticsId) {
      postAnalytics('/api/analytics/session', {
        event: 'end',
        sessionId: analyticsId,
        durationMs: Date.now() - startedAtRef.current,
        status: 'ended',
      });
    }

    // Clear any pending reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const ws = wsRef.current;
    wsRef.current = null;

    // Close WS after nulling ref so onclose handler sees intentionalClose
    ws?.close();

    cleanupAudio();

    sessionReadyRef.current = false;
    setStatus({ phase: 'idle', transcript: '', responseText: '', error: null });
  }, [cleanupAudio]);

  const isConnected = status.phase !== 'idle' && status.phase !== 'error' && status.phase !== 'connecting';

  // Analytics: flush session end on tab hide / pagehide using sendBeacon so the
  // request survives the page being torn down. Any active session is marked
  // 'abandoned' (user didn't click Disconnect).
  useEffect(() => {
    const flushEnd = (endStatus: 'ended' | 'abandoned') => {
      const id = sessionIdRef.current;
      if (!id) return;
      const payload = JSON.stringify({
        event: 'end',
        sessionId: id,
        durationMs: Date.now() - startedAtRef.current,
        status: endStatus,
      });
      try {
        navigator.sendBeacon(
          '/api/analytics/session',
          new Blob([payload], { type: 'application/json' }),
        );
      } catch {
        // swallow — analytics must never interfere with unload
      }
      sessionIdRef.current = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushEnd('abandoned');
    };
    const onPageHide = () => flushEnd('abandoned');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  return { status, analyserRef, connect, disconnect, isConnected };
}
