"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MusicState {
  enabled: boolean;
  volume: number;
  toggle: () => void;
  setEnabled: (v: boolean) => void;
  setVolume: (v: number) => void;
}

/** Background-music preference, persisted across sessions. */
export const useMusicStore = create<MusicState>()(
  persist(
    (set) => ({
      enabled: false,
      volume: 0.35,
      toggle: () => set((s) => ({ enabled: !s.enabled })),
      setEnabled: (v) => set({ enabled: v }),
      setVolume: (v) => set({ volume: v }),
    }),
    { name: "treasure-hunt-music" }
  )
);
