import { create } from 'zustand';

export type ImpactResult = {
  grid: string;
  world: { x: number; y: number; z: number };
  distanceToTarget: number;
  distanceToFriendlies: number;
  timestamp: number;
} | null;

export type TurnLog = { role: 'user' | 'pilot'; text: string; ts: number };
export type Debrief = { verdict: 'solid' | 'needs_work' | 'unsafe' | 'no_strike'; critique: string } | null;

interface SceneState {
  reticleGrid: string;
  transmittedGrid: string | null;
  impactResult: ImpactResult;
  lasedRange: number | null;
  /** Monotonic timestamp of the last lase event; Reticle keys flash + pulse off it. */
  lasePulseAt: number;
  transcript: TurnLog[];
  debrief: Debrief;
  setReticleGrid: (g: string) => void;
  setTransmittedGrid: (g: string | null) => void;
  setImpactResult: (r: ImpactResult) => void;
  setLasedRange: (r: number | null) => void;
  setLasePulseAt: (t: number) => void;
  appendTurn: (t: TurnLog) => void;
  clearTranscript: () => void;
  setDebrief: (d: Debrief) => void;
  endRun: () => void;
}

export const useStore = create<SceneState>((set) => ({
  reticleGrid: '500500',
  transmittedGrid: null,
  impactResult: null,
  lasedRange: null,
  lasePulseAt: 0,
  transcript: [],
  debrief: null,
  setReticleGrid: (g) => set({ reticleGrid: g }),
  setTransmittedGrid: (g) => set({ transmittedGrid: g }),
  setImpactResult: (r) => set({ impactResult: r }),
  setLasedRange: (r) => set({ lasedRange: r }),
  setLasePulseAt: (t) => set({ lasePulseAt: t }),
  appendTurn: (t) => set((s) => ({ transcript: [...s.transcript, t] })),
  clearTranscript: () => set({ transcript: [] }),
  setDebrief: (d) => set({ debrief: d }),
  endRun: () => set({ transmittedGrid: null, lasedRange: null, impactResult: null, transcript: [], debrief: null }),
}));
