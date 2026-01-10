import { create } from 'zustand';
import type { User } from '../types';
import { setAccessToken, authApi, clearLegacyStorage } from '../api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  login: async (email, password, rememberMe = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ email, password, rememberMe });
      set({
        user: response.user as User,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '로그인에 실패했습니다.',
        isLoading: false,
      });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register({ email, password, name });
      set({
        user: response.user as User,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '회원가입에 실패했습니다.',
        isLoading: false,
      });
      throw err;
    }
  },

  logout: async () => {
    await authApi.logout();
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  // 앱 초기화 시 세션 복원 시도
  initAuth: async () => {
    set({ isLoading: true });

    // 기존 localStorage 토큰 정리 (마이그레이션)
    clearLegacyStorage();

    try {
      // Refresh Token으로 세션 복원 시도
      const response = await authApi.refreshToken();

      if (response) {
        set({
          user: response.user as User,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  clearError: () => set({ error: null }),
}));

// 로그아웃 이벤트 리스너 등록 (토큰 갱신 실패 시)
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    setAccessToken(null);
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
    });
  });
}
