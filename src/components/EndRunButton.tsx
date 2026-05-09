'use client';

import { useEffect, useState } from 'react';
import { useStore, type TurnLog, type ImpactResult, type Debrief } from '@/lib/store';

export default function EndRunButton() {
  const impactResult = useStore((s) => s.impactResult);
  const transcript = useStore((s) => s.transcript);
  const debrief = useStore((s) => s.debrief);
  const [inFlight, setInFlight] = useState(false);

  // Dev hooks for debrief-smoke.ts (mirrors BombImpact pattern at L171-188)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as {
      __appendTurn?: (t: TurnLog) => void;
      __triggerEndRun?: () => void;
      __getDebrief?: () => Debrief;
    };
    w.__appendTurn = (t) => useStore.getState().appendTurn(t);
    w.__triggerEndRun = () => {
      const btn = document.querySelector('[data-testid="end-run"]') as HTMLButtonElement | null;
      btn?.click();
    };
    w.__getDebrief = () => useStore.getState().debrief;
    return () => {
      delete w.__appendTurn;
      delete w.__triggerEndRun;
      delete w.__getDebrief;
    };
  }, []);

  const hasDebrief = debrief !== null;
  const disabled = !hasDebrief && (impactResult === null || inFlight);

  const onClick = async () => {
    if (hasDebrief) {
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
      const res = await fetch('/api/debrief', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('http ' + res.status);
      const json = (await res.json()) as { verdict: 'solid' | 'needs_work' | 'unsafe' | 'no_strike'; critique: string };
      useStore.getState().setDebrief(json);
    } catch {
      useStore.getState().setDebrief({ verdict: 'no_strike', critique: 'Debrief request failed locally.' });
    } finally {
      setInFlight(false);
    }
  };

  const label = hasDebrief
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
