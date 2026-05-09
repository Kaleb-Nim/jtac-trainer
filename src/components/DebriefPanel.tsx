'use client';

import { useStore } from '@/lib/store';

function overallBorderClass(overall: number): string {
  if (overall >= 80) return 'text-green-400 border-green-700';
  if (overall >= 60) return 'text-amber-400 border-amber-700';
  return 'text-red-400 border-red-700';
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm italic text-zinc-500">— none —</p>;
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-200">
      {items.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}

function ScoreRow({
  label,
  score,
  testId,
}: {
  label: string;
  score: number;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex items-baseline justify-between border-b border-zinc-800 py-1 font-mono text-sm text-zinc-300"
    >
      <span className="uppercase tracking-widest text-zinc-400">{label}</span>
      <span className="tabular-nums text-zinc-100">{score}/100</span>
    </div>
  );
}

export default function DebriefPanel() {
  const evaluation = useStore((s) => s.evaluation);
  if (!evaluation) return null;

  const { scores, didWell, needsWork } = evaluation;
  const overallClass = overallBorderClass(scores.overall);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="pointer-events-auto w-[560px] max-w-[90vw] border border-amber-700 bg-black/90 p-6 font-mono text-zinc-100 shadow-2xl"
        role="dialog"
        aria-label="Mission evaluation"
      >
        <div className="mb-4 flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-widest text-zinc-500">EVALUATION</span>
          <span
            data-testid="eval-overall"
            className={`border px-3 py-1 text-sm uppercase tracking-widest tabular-nums ${overallClass}`}
          >
            {scores.overall}/100
          </span>
        </div>

        <div className="mb-5">
          <ScoreRow label="Phraseology" score={scores.phraseology} testId="eval-phraseology" />
          <ScoreRow label="Grid Accuracy" score={scores.gridAccuracy} testId="eval-grid-accuracy" />
          <ScoreRow label="Safety" score={scores.safety} testId="eval-safety" />
        </div>

        <div className="mb-4">
          <div className="mb-2 text-xs uppercase tracking-widest text-zinc-500">Did Well</div>
          <BulletList items={didWell} />
        </div>

        <div className="mb-6">
          <div className="mb-2 text-xs uppercase tracking-widest text-zinc-500">Needs Work</div>
          <BulletList items={needsWork} />
        </div>

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
