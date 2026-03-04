import { create } from 'zustand';

export type ViewMode = 
  | 'architecture' 
  | 'risk' 
  | 'revenue' 
  | 'dependency' 
  | 'responsibility';

interface ViewModeState {
  currentMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const useViewModeStore = create<ViewModeState>((set) => ({
  currentMode: 'architecture',
  setViewMode: (mode: ViewMode) => set({ currentMode: mode }),
}));
