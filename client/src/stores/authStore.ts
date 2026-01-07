import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { setAuthToken, authApi } from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setToken: (token) => {
        setAuthToken(token);
        set({ token });
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ email, password });
          setAuthToken(response.token);
          set({
            user: response.user as User,
            token: response.token,
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
          setAuthToken(response.token);
          set({
            user: response.user as User,
            token: response.token,
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

      logout: () => {
        setAuthToken(null);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isLoading: false });
          return;
        }

        setAuthToken(token);
        try {
          const response = await authApi.me();
          set({
            user: response.user as User,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // 토큰이 유효하지 않음
          setAuthToken(null);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      setLoading: (isLoading) => set({ isLoading }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // 저장된 토큰이 있으면 API 클라이언트에도 설정
        if (state?.token) {
          setAuthToken(state.token);
        }
      },
    }
  )
);
