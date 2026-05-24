import { create } from 'zustand';

const useJobStore = create((set) => ({
  activeJob: null,

  setActiveJob: (job) => set({ activeJob: job }),

  // Merge partial updates into activeJob (e.g., after inspection patch)
  updateActiveJob: (patch) =>
    set((state) => ({
      activeJob: state.activeJob ? { ...state.activeJob, ...patch } : null,
    })),

  clearJob: () => set({ activeJob: null }),
}));

export default useJobStore;
