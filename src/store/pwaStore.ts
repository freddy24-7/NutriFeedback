import { create } from 'zustand';

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

type PWAStore = {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  setDeferredPrompt: (e: BeforeInstallPromptEvent | null) => void;
  setInstalled: () => void;
  triggerInstall: () => Promise<void>;
};

export const usePWAStore = create<PWAStore>((set, get) => ({
  deferredPrompt: null,
  isInstalled: false,

  setDeferredPrompt: (e) => set({ deferredPrompt: e }),
  setInstalled: () => set({ deferredPrompt: null, isInstalled: true }),

  triggerInstall: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return;
    set({ deferredPrompt: null });
    await deferredPrompt.prompt();
  },
}));
