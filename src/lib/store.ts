import { create } from 'zustand';

interface SceneState {
  reticleGrid: string;
  transmittedGrid: string | null;
  impactResult: unknown | null;
  setReticleGrid: (g: string) => void;
  setTransmittedGrid: (g: string | null) => void;
  setImpactResult: (r: unknown | null) => void;
}

export const useStore = create<SceneState>((set) => ({
  reticleGrid: '500500',
  transmittedGrid: null,
  impactResult: null,
  setReticleGrid: (g) => set({ reticleGrid: g }),
  setTransmittedGrid: (g) => set({ transmittedGrid: g }),
  setImpactResult: (r) => set({ impactResult: r }),
}));
