"use client";

import { create } from "zustand";

interface UiState {
  /** Riddle id whose "correct!" celebration has been shown this session. */
  celebratedRiddles: string[];
  markCelebrated: (riddleId: string) => void;
  finaleSeen: boolean;
  setFinaleSeen: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  celebratedRiddles: [],
  markCelebrated: (riddleId) =>
    set((s) =>
      s.celebratedRiddles.includes(riddleId)
        ? s
        : { celebratedRiddles: [...s.celebratedRiddles, riddleId] }
    ),
  finaleSeen: false,
  setFinaleSeen: (v) => set({ finaleSeen: v }),
}));
