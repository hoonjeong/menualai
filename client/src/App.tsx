import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/layout';
import { Dashboard, Login, Register, Workspaces, WorkspaceNew, WorkspaceDetail, DocumentEditor, Documents, Settings } from './pages';
import { useAuthStore, useUIStore, useToastStore } from './stores';
import { ToastContainer } from './components/common/Toast';

// React Query 클라이언트
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      retry: 1,
    },
  },
});

// 인증 필요 라우트 래퍼
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// 테마 초기화 컴포넌트
function ThemeInitializer({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', systemDark);

      // 시스템 테마 변경 감지
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle('dark', e.matches);
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return <>{children}</>;
}

function App() {
  const { initAuth } = useAuthStore();
  const { toasts, removeToast } = useToastStore();

  // 앱 초기화 시 세션 복원 시도
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer>
        <BrowserRouter>
          <Routes>
            {/* 공개 라우트 */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* 인증 필요 라우트 */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="workspaces" element={<Workspaces />} />
              <Route path="workspace/new" element={<WorkspaceNew />} />
              <Route path="workspace/:id" element={<WorkspaceDetail />} />
              <Route path="documents" element={<Documents />} />
              <Route path="document/:id" element={<DocumentEditor />} />
              <Route path="document/:id/edit" element={<DocumentEditor />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* 404 */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex flex-col items-center justify-center">
                  <h1 className="text-4xl font-bold mb-4">404</h1>
                  <p className="text-gray-500 mb-4">페이지를 찾을 수 없습니다.</p>
                  <a href="/" className="btn-primary">
                    홈으로 돌아가기
                  </a>
                </div>
              }
            />
          </Routes>
          <ToastContainer toasts={toasts} onClose={removeToast} />
        </BrowserRouter>
      </ThemeInitializer>
    </QueryClientProvider>
  );
}

export default App;
