'use client';

import { useStore } from '@/lib/store';

const verdictClass: Record<string, string> = {
  solid: 'text-green-400 border-green-700',
  needs_work: 'text-amber-400 border-amber-700',
  unsafe: 'text-red-400 border-red-700',
  no_strike: 'text-zinc-400 border-zinc-700',
};

export default function DebriefPanel() {
  const debrief = useStore((s) => s.debrief);
  if (!debrief) return null;

  const badgeClass = verdictClass[debrief.verdict] ?? 'text-zinc-400 border-zinc-700';

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="pointer-events-auto w-[480px] max-w-[90vw] border border-amber-700 bg-black/90 p-6 font-mono text-zinc-100 shadow-2xl"
        role="dialog"
        aria-label="Mission debrief"
      >
        <div className="mb-4 flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-widest text-zinc-500">DEBRIEF</span>
          <span
            data-testid="debrief-verdict"
            className={`border px-3 py-1 text-sm uppercase tracking-widest ${badgeClass}`}
          >{debrief.verdict}</span>
        </div>
        <p data-testid="debrief-critique" className="mb-6 text-sm leading-relaxed text-zinc-200">
          {debrief.critique}
        </p>
        <button
          type="button"
          onClick={() => useStore.getState().endRun()}
          className="w-full border border-amber-700 bg-black/60 px-4 py-2 text-sm uppercase tracking-widest text-amber-300 hover:bg-amber-900/30"
        >
          [ NEW RUN ]
        </button>
      </div>
    </div>
  );
}
