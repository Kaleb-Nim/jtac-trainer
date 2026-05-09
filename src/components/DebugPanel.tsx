'use client';

import { useState } from 'react';

interface DebugPanelProps {
  transcript: string;
  responseText: string;
}

export default function DebugPanel({ transcript, responseText }: DebugPanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="absolute bottom-4 left-4 z-10 max-w-md font-mono">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded border border-zinc-700 bg-black/70 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
      >
        [debug]
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 rounded border border-zinc-800 bg-black/80 p-2">
          <section className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">
              Transcript (you):
            </label>
            <pre
              data-testid="transcript"
              className="min-h-[2rem] max-h-32 overflow-auto whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-100"
            >
              {transcript || '—'}
            </pre>
          </section>
          <section className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">
              Response (Hawg 21):
            </label>
            <pre
              data-testid="response"
              className="min-h-[2rem] max-h-32 overflow-auto whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-100"
            >
              {responseText || '—'}
            </pre>
          </section>
        </div>
      )}
    </div>
  );
}
