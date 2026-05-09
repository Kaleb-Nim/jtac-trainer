'use client';

import type { RealtimeStatus } from '@/hooks/useRealtimeVoice';

interface TalkButtonProps {
  status: RealtimeStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
}

export default function TalkButton({ status, connect, disconnect, isConnected }: TalkButtonProps) {
  const handleClick = () => {
    if (isConnected || status.phase === 'connecting') {
      disconnect();
    } else {
      // CRITICAL: synchronous connect() call inside click handler — preserves
      // mobile user-gesture window for getUserMedia (Phase 1 race fix).
      void connect();
    }
  };

  const showDisconnect = isConnected || status.phase === 'connecting';

  return (
    <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        className="rounded border border-zinc-600 bg-zinc-900/90 px-6 py-3 text-base font-mono text-zinc-100 hover:bg-zinc-800 active:bg-zinc-700"
      >
        {showDisconnect ? <>Disconnect</> : <>Connect</>}
      </button>
      <div data-testid="phase" className="text-xs text-zinc-300 bg-black/60 px-2 py-1 rounded font-mono">
        phase: {status.phase}
      </div>
      {status.error && (
        <div data-testid="error" className="max-w-xl text-xs text-red-400 bg-black/70 px-2 py-1 rounded font-mono">
          error: {status.error}
        </div>
      )}
    </div>
  );
}
