import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // 사이드바 상태
  sidebarOpen: boolean;
  aiPanelOpen: boolean;

  // 테마
  theme: 'light' | 'dark' | 'system';

  // 검색
  searchQuery: string;
  searchOpen: boolean;

  // 모달 상태
  activeModal: string | null;
  modalData: unknown;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  toggleAIPanel: () => void;
  setAIPanelOpen: (open: boolean) => void;

  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;

  openModal: (modalId: string, data?: unknown) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      aiPanelOpen: false,
      theme: 'system',
      searchQuery: '',
      searchOpen: false,
      activeModal: null,
      modalData: null,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

      toggleAIPanel: () => set((state) => ({ aiPanelOpen: !state.aiPanelOpen })),
      setAIPanelOpen: (aiPanelOpen) => set({ aiPanelOpen }),

      setTheme: (theme) => {
        // 실제 테마 적용
        const root = document.documentElement;
        if (theme === 'system') {
          const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          root.classList.toggle('dark', systemDark);
        } else {
          root.classList.toggle('dark', theme === 'dark');
        }
        set({ theme });
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),

      openModal: (activeModal, modalData = null) => set({ activeModal, modalData }),
      closeModal: () => set({ activeModal: null, modalData: null }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
