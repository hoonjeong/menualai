import { Moon, Sun, Bell, MessageSquare } from 'lucide-react';
import { useUIStore } from '../../stores';
import clsx from 'clsx';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { theme, setTheme, aiPanelOpen, toggleAIPanel, sidebarOpen } = useUIStore();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header
      className={clsx(
        'fixed top-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-30',
        'flex items-center justify-between px-6 transition-all',
        sidebarOpen ? 'left-64' : 'left-16'
      )}
    >
      {/* 페이지 제목 */}
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
        )}
      </div>

      {/* 우측 액션 버튼들 */}
      <div className="flex items-center gap-2">
        {/* AI 패널 토글 */}
        <button
          onClick={toggleAIPanel}
          className={clsx(
            'p-2 rounded-lg transition-colors',
            aiPanelOpen
              ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
          )}
          title="AI 어시스턴트"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* 알림 */}
        <button
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
          title="알림"
        >
          <Bell className="w-5 h-5" />
        </button>

        {/* 테마 토글 */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
          title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
      </div>
    </header>
  );
}
