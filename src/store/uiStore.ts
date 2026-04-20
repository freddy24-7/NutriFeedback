import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'en' | 'nl';
type Theme = 'light' | 'dark';

type UIStore = {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'en',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'ui-preferences' },
  ),
);
