import { create } from 'zustand'

interface UIState {
  isSidebarCollapsed: boolean
  toggleSidebar: () => void
  isSimulating: boolean
  toggleSimulation: () => void
  setSimulating: (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  isSimulating: false,
  toggleSimulation: () => set((state) => ({ isSimulating: !state.isSimulating })),
  setSimulating: (v) => set({ isSimulating: v }),
}))
