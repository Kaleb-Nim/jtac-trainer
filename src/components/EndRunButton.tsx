'use client';

import { useEffect, useState } from 'react';
import { useStore, type TurnLog, type ImpactResult, type Evaluation } from '@/lib/store';

export default function EndRunButton() {
  const impactResult = useStore((s) => s.impactResult);
  const transcript = useStore((s) => s.transcript);
  const evaluation = useStore((s) => s.evaluation);
  const [inFlight, setInFlight] = useState(false);

  // Dev hooks for debrief-smoke.ts (mirrors BombImpact pattern at L171-188)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as {
      __appendTurn?: (t: TurnLog) => void;
      __triggerEndRun?: () => void;
      __getEvaluation?: () => Evaluation;
    };
    w.__appendTurn = (t) => useStore.getState().appendTurn(t);
    w.__triggerEndRun = () => {
      const btn = document.querySelector('[data-testid="end-run"]') as HTMLButtonElement | null;
      btn?.click();
    };
    w.__getEvaluation = () => useStore.getState().evaluation;
    return () => {
      delete w.__appendTurn;
      delete w.__triggerEndRun;
      delete w.__getEvaluation;
    };
  }, []);

  const hasEvaluation = evaluation !== null;
  const disabled = !hasEvaluation && (impactResult === null || inFlight);

  const onClick = async () => {
    if (hasEvaluation) {
      useStore.getState().endRun();
      return;
    }
    if (impactResult === null || inFlight) return;
    setInFlight(true);
    try {
      const impact: ImpactResult = impactResult;
      const payload = {
        transcript: transcript.map((t) => ({ role: t.role, text: t.text })),
        impact: impact
          ? {
              distanceToTarget: impact.distanceToTarget,
              distanceToFriendlies: impact.distanceToFriendlies,
              grid: impact.grid,
            }
          : null,
        correctGrid: '599699',
      };
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('http ' + res.status);
      const json = (await res.json()) as {
        scores: { overall: number; phraseology: number; gridAccuracy: number; safety: number };
        didWell: string[];
        needsWork: string[];
      };
      useStore.getState().setEvaluation(json);
    } catch {
      useStore.getState().setEvaluation({
        scores: { overall: 0, phraseology: 0, gridAccuracy: 0, safety: 0 },
        didWell: [],
        needsWork: ['Evaluator request failed locally.'],
      });
    } finally {
      setInFlight(false);
    }
  };

  const label = hasEvaluation
    ? '[ NEW RUN ]'
    : inFlight
      ? '[ ANALYZING... ]'
      : '[ END RUN ]';

  return (
    <button
      type="button"
      data-testid="end-run"
      disabled={disabled}
      onClick={onClick}
      className="absolute left-4 top-4 z-40 border border-amber-700 bg-black/85 px-4 py-2 font-mono text-sm uppercase tracking-widest text-amber-300 hover:bg-amber-900/30 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}
