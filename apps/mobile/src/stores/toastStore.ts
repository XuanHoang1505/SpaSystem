import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

export type Toast = { id: number; tone: ToastTone; message: string };

interface ToastState {
  current: Toast | null;
  show: (tone: ToastTone, message: string) => void;
  hide: (id?: number) => void;
}

let nextId = 1;

/** One toast at a time: a new one replaces the one on screen. UI state only, so it lives in Zustand. */
export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (tone, message) => set({ current: { id: nextId++, tone, message } }),
  // With an id, only that toast is hidden, so a late timer cannot close a newer one.
  hide: (id) =>
    set((state) => (id === undefined || state.current?.id === id ? { current: null } : state)),
}));

/** Short feedback after an action, shown by `AppToastHost` (the mobile counterpart of the web `sonner` toast). */
export const toast = {
  success: (message: string) => useToastStore.getState().show('success', message),
  error: (message: string) => useToastStore.getState().show('error', message),
  info: (message: string) => useToastStore.getState().show('info', message),
};
