import { create } from 'zustand';

export type ImpactResult = {
  grid: string;
  world: { x: number; y: number; z: number };
  distanceToTarget: number;
  distanceToFriendlies: number;
  timestamp: number;
} | null;

export type WeaponRelease = {
  id: number;
  grid: string;
  timestamp: number;
} | null;

export type TurnLog = { role: 'user' | 'pilot'; text: string; ts: number };
export type Debrief = { verdict: 'solid' | 'needs_work' | 'unsafe' | 'no_strike'; critique: string } | null;

export type EvaluationScores = {
  overall: number;
  phraseology: number;
  gridAccuracy: number;
  safety: number;
};
export type Evaluation = {
  scores: EvaluationScores;
  didWell: string[];
  needsWork: string[];
} | null;

interface SceneState {
  reticleGrid: string;
  transmittedGrid: string | null;
  weaponRelease: WeaponRelease;
  impactResult: ImpactResult;
  lasedRange: number | null;
  /** Monotonic timestamp of the last lase event; Reticle keys flash + pulse off it. */
  lasePulseAt: number;
  transcript: TurnLog[];
  debrief: Debrief;
  evaluation: Evaluation;
  setReticleGrid: (g: string) => void;
  setTransmittedGrid: (g: string | null) => void;
  releaseWeapon: (g: string) => void;
  setImpactResult: (r: ImpactResult) => void;
  setLasedRange: (r: number | null) => void;
  setLasePulseAt: (t: number) => void;
  appendTurn: (t: TurnLog) => void;
  clearTranscript: () => void;
  setDebrief: (d: Debrief) => void;
  setEvaluation: (e: Evaluation) => void;
  endRun: () => void;
}

export const useStore = create<SceneState>((set) => ({
  reticleGrid: '500500',
  transmittedGrid: null,
  weaponRelease: null,
  impactResult: null,
  lasedRange: null,
  lasePulseAt: 0,
  transcript: [],
  debrief: null,
  evaluation: null,
  setReticleGrid: (g) => set({ reticleGrid: g }),
  setTransmittedGrid: (g) => set({ transmittedGrid: g }),
  releaseWeapon: (g) => set((s) => ({
    weaponRelease: {
      id: (s.weaponRelease?.id ?? 0) + 1,
      grid: g,
      timestamp: Date.now(),
    },
  })),
  setImpactResult: (r) => set({ impactResult: r }),
  setLasedRange: (r) => set({ lasedRange: r }),
  setLasePulseAt: (t) => set({ lasePulseAt: t }),
  appendTurn: (t) => set((s) => ({ transcript: [...s.transcript, t] })),
  clearTranscript: () => set({ transcript: [] }),
  setDebrief: (d) => set({ debrief: d }),
  setEvaluation: (e) => set({ evaluation: e }),
  endRun: () => set({
    transmittedGrid: null,
    weaponRelease: null,
    lasedRange: null,
    impactResult: null,
    transcript: [],
    debrief: null,
    evaluation: null,
  }),
}));
