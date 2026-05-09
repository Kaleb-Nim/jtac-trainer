'use client';

import { useRealtimeVoice } from '@/hooks/useRealtimeVoice';

export default function Home() {
  const { status, connect, disconnect, isConnected } = useRealtimeVoice();

  const handleClick = () => {
    if (isConnected || status.phase === 'connecting') {
      disconnect();
    } else {
      void connect();
    }
  };

  const buttonLabel = isConnected || status.phase === 'connecting' ? 'Disconnect' : 'Connect';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black p-8 font-mono text-zinc-100">
      <h1 className="text-2xl tracking-tight">JTAC Trainer — Voice Smoke Test</h1>

      <button
        type="button"
        onClick={handleClick}
        className="rounded border border-zinc-600 bg-zinc-900 px-6 py-3 text-base hover:bg-zinc-800 active:bg-zinc-700"
      >
        {buttonLabel}
      </button>

      <div data-testid="phase" className="text-sm text-zinc-400">
        phase: {status.phase}
      </div>

      {status.error && (
        <div data-testid="error" className="max-w-xl text-sm text-red-400">
          error: {status.error}
        </div>
      )}

      <section className="flex w-full max-w-xl flex-col gap-2">
        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Transcript (you):
        </label>
        <pre
          data-testid="transcript"
          className="min-h-[3rem] whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-950 p-3 text-sm"
        >
          {status.transcript || '—'}
        </pre>
      </section>

      <section className="flex w-full max-w-xl flex-col gap-2">
        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Response (Hawg 21):
        </label>
        <pre
          data-testid="response"
          className="min-h-[3rem] whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-950 p-3 text-sm"
        >
          {status.responseText || '—'}
        </pre>
      </section>
    </main>
  );
}
