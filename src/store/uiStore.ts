import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'en' | 'nl';
type Theme = 'light' | 'dark';

type UIStore = {
  theme: Theme;
  language: Language;
  selectedDiet: string | null;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setSelectedDiet: (diet: string | null) => void;
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'en',
      selectedDiet: null,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setSelectedDiet: (diet) => set({ selectedDiet: diet }),
    }),
    { name: 'ui-preferences' },
  ),
);
