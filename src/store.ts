import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'hi' | 'mr' | 'ml' | 'te' | 'kn' | 'or' | 'pa' | 'bn' | 'as' | 'gu' | 'ta';

interface AppState {
  activeChildId: string | null;
  setActiveChildId: (id: string | null) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (v: boolean) => void;
  parentName: string;
  setParentName: (name: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeChildId: null,
      setActiveChildId: (id) => set({ activeChildId: id }),
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),
      darkMode: false,
      toggleDarkMode: () => set(state => ({ darkMode: !state.darkMode })),
      setDarkMode: (v) => set({ darkMode: v }),
      parentName: '',
      setParentName: (name) => set({ parentName: name }),
    }),
    {
      name: 'swasthya-setu-storage',
    }
  )
);
