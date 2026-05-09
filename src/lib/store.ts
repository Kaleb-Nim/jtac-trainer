import { create } from 'zustand';

export type ImpactResult = {
  grid: string;
  world: { x: number; y: number; z: number };
  distanceToTarget: number;
  distanceToFriendlies: number;
  timestamp: number;
} | null;

interface SceneState {
  reticleGrid: string;
  transmittedGrid: string | null;
  impactResult: ImpactResult;
  lasedRange: number | null;
  /** Monotonic timestamp of the last lase event; Reticle keys flash + pulse off it. */
  lasePulseAt: number;
  setReticleGrid: (g: string) => void;
  setTransmittedGrid: (g: string | null) => void;
  setImpactResult: (r: ImpactResult) => void;
  setLasedRange: (r: number | null) => void;
  setLasePulseAt: (t: number) => void;
}

export const useStore = create<SceneState>((set) => ({
  reticleGrid: '500500',
  transmittedGrid: null,
  impactResult: null,
  lasedRange: null,
  lasePulseAt: 0,
  setReticleGrid: (g) => set({ reticleGrid: g }),
  setTransmittedGrid: (g) => set({ transmittedGrid: g }),
  setImpactResult: (r) => set({ impactResult: r }),
  setLasedRange: (r) => set({ lasedRange: r }),
  setLasePulseAt: (t) => set({ lasePulseAt: t }),
}));
