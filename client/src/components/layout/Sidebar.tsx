import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  FolderOpen,
  FileText,
  Settings,
  ChevronLeft,
  Plus,
  Search,
} from 'lucide-react';
import { useUIStore, useWorkspaceStore, useAuthStore } from '../../stores';
import clsx from 'clsx';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar, setSearchOpen } = useUIStore();
  const { workspaces, currentWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const { user } = useAuthStore();

  useEffect(() => {
    // 워크스페이스 목록을 한 번만 로드
    if (workspaces.length === 0) {
      fetchWorkspaces();
    }
  }, [workspaces.length, fetchWorkspaces]);

  const navItems = [
    { path: '/', icon: Home, label: '대시보드' },
    { path: '/workspaces', icon: FolderOpen, label: '사업 목록' },
    { path: '/documents', icon: FileText, label: '내 문서' },
    { path: '/settings', icon: Settings, label: '설정' },
  ];

  return (
    <aside
      className={clsx(
        'sidebar fixed left-0 top-0 z-40 flex flex-col transition-sidebar',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* 로고 영역 */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        {sidebarOpen && (
          <Link to="/" className="text-xl font-bold text-primary-600">
            Manualic
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft
            className={clsx(
              'w-5 h-5 transition-transform',
              !sidebarOpen && 'rotate-180'
            )}
          />
        </button>
      </div>

      {/* 검색 버튼 */}
      <div className="p-3">
        <button
          onClick={() => setSearchOpen(true)}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
            'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700',
            'text-gray-500 dark:text-gray-400 transition-colors'
          )}
        >
          <Search className="w-4 h-4" />
          {sidebarOpen && <span className="text-sm">검색...</span>}
        </button>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* 워크스페이스 목록 */}
        {sidebarOpen && workspaces.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                사업 목록
              </span>
              <button
                onClick={() => navigate('/workspace/new')}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                title="새 사업 만들기"
              >
                <Plus className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-1">
              {workspaces.slice(0, 5).map((workspace) => (
                <Link
                  key={workspace.id}
                  to={`/workspace/${workspace.id}`}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                    currentWorkspace?.id === workspace.id
                      ? 'bg-gray-200 dark:bg-gray-700'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <span className="text-lg">{workspace.icon || '📁'}</span>
                  <span className="truncate text-sm">{workspace.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* 하단 사용자 정보 */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || '사용자'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
