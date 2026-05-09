'use client';

import type { KeyboardEvent, PointerEvent } from 'react';
import type { RealtimeStatus } from '@/hooks/useRealtimeVoice';

interface TalkButtonProps {
  status: RealtimeStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
  startTransmit: () => void;
  stopTransmit: () => void;
  isConnected: boolean;
}

export default function TalkButton({
  status,
  connect,
  disconnect,
  startTransmit,
  stopTransmit,
  isConnected,
}: TalkButtonProps) {
  const handleConnectClick = () => {
    if (status.phase === 'connecting') {
      disconnect();
    } else {
      // CRITICAL: synchronous connect() call inside click handler — preserves
      // mobile user-gesture window for getUserMedia (Phase 1 race fix).
      void connect();
    }
  };

  const canTransmit = status.phase === 'listening' || status.phase === 'transmitting';
  const isTransmitting = status.phase === 'transmitting';
  const transmitLabel =
    status.phase === 'transmitting'
      ? 'Release to Send'
      : status.phase === 'processing'
        ? 'Processing...'
        : status.phase === 'responding'
          ? 'Pilot Responding'
          : 'Hold to Talk';

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!canTransmit) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    startTransmit();
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stopTransmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!canTransmit) return;
    if (event.repeat) return;
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    startTransmit();
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    stopTransmit();
  };

  if (!isConnected) {
    return (
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleConnectClick}
          className="rounded border border-zinc-600 bg-zinc-900/90 px-6 py-3 text-base font-mono text-zinc-100 hover:bg-zinc-800 active:bg-zinc-700"
        >
          {status.phase === 'connecting' ? <>Cancel</> : <>Connect</>}
        </button>
        <div data-testid="phase" className="rounded bg-black/60 px-2 py-1 font-mono text-xs text-zinc-300">
          phase: {status.phase}
        </div>
        {status.error && (
          <div data-testid="error" className="max-w-xl rounded bg-black/70 px-2 py-1 font-mono text-xs text-red-400">
            error: {status.error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
      <button
        type="button"
        disabled={!canTransmit}
        aria-pressed={isTransmitting}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={stopTransmit}
        onLostPointerCapture={stopTransmit}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={stopTransmit}
        className={[
          'touch-none select-none rounded border px-8 py-4 text-base font-mono text-zinc-100 transition',
          isTransmitting
            ? 'border-red-400 bg-red-950/90 shadow-[0_0_24px_rgba(248,113,113,0.35)]'
            : 'border-zinc-600 bg-zinc-900/90 hover:bg-zinc-800 active:bg-zinc-700',
          !canTransmit ? 'cursor-not-allowed opacity-60 hover:bg-zinc-900/90 active:bg-zinc-900/90' : '',
        ].join(' ')}
      >
        {transmitLabel}
      </button>
      <button
        type="button"
        onClick={disconnect}
        className="rounded border border-zinc-700 bg-black/70 px-3 py-1 text-xs font-mono text-zinc-300 hover:bg-zinc-900"
      >
        Disconnect
      </button>
      <div data-testid="phase" className="rounded bg-black/60 px-2 py-1 font-mono text-xs text-zinc-300">
        phase: {status.phase}
      </div>
      {status.error && (
        <div data-testid="error" className="max-w-xl rounded bg-black/70 px-2 py-1 font-mono text-xs text-red-400">
          error: {status.error}
        </div>
      )}
    </div>
  );
}
