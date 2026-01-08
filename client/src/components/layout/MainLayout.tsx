import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AIPanel } from './AIPanel';
import { SearchModal } from './SearchModal';
import { useUIStore } from '../../stores';
import clsx from 'clsx';

interface MainLayoutProps {
  title?: string;
}

export function MainLayout({ title }: MainLayoutProps) {
  const { sidebarOpen, aiPanelOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <Header title={title} />
      <AIPanel />
      <SearchModal />

      <main
        className={clsx(
          'pt-16 min-h-screen transition-all',
          sidebarOpen ? 'pl-64' : 'pl-16',
          aiPanelOpen && 'pr-80'
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
