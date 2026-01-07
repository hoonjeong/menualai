import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, MoreVertical, Users, FileText, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useWorkspaceStore } from '../stores';

interface WorkspaceWithStatus {
  id: number;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'inactive' | 'archived';
  memberCount: number;
  documentCount: number;
  categories?: unknown[];
}

export function Workspaces() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const { workspaces: storeWorkspaces, isLoading, fetchWorkspaces } = useWorkspaceStore();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // 스토어 데이터를 UI 형식으로 변환
  const workspaces: WorkspaceWithStatus[] = storeWorkspaces.map((ws) => ({
    id: ws.id,
    name: ws.name,
    description: ws.description || '',
    icon: ws.icon || '📁',
    status: 'active' as const, // TODO: 실제 상태 관리
    memberCount: 1, // TODO: 멤버 수 추가
    documentCount: 0, // TODO: 문서 수 추가
    categories: (ws as { categories?: unknown[] }).categories || [],
  }));

  const filteredWorkspaces = workspaces.filter((ws) => {
    const matchesSearch =
      ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && ws.status === 'active') ||
      (filter === 'archived' && ws.status === 'archived');
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">사업 목록</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {workspaces.length}개의 사업을 관리하고 있습니다.
          </p>
        </div>
        <Link to="/workspace/new" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          새 사업 만들기
        </Link>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="사업 검색..."
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'archived'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {f === 'all' ? '전체' : f === 'active' ? '활성' : '보관됨'}
            </button>
          ))}
        </div>
      </div>

      {/* 워크스페이스 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWorkspaces.map((workspace) => (
          <Link
            key={workspace.id}
            to={`/workspace/${workspace.id}`}
            className="card p-5 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{workspace.icon}</span>
                <div>
                  <h3 className="font-semibold group-hover:text-primary-600 transition-colors">
                    {workspace.name}
                  </h3>
                  <span
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded-full',
                      workspace.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    )}
                  >
                    {workspace.status === 'active' ? '활성' : '보관됨'}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: 드롭다운 메뉴
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">
              {workspace.description}
            </p>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{workspace.memberCount}명</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>{workspace.documentCount}개 문서</span>
              </div>
            </div>
          </Link>
        ))}

        {/* 새 사업 만들기 카드 */}
        <Link
          to="/workspace/new"
          className="card p-5 border-2 border-dashed hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all flex flex-col items-center justify-center min-h-[200px] text-gray-500"
        >
          <Plus className="w-10 h-10 mb-3" />
          <span className="font-medium">새 사업 만들기</span>
          <span className="text-sm mt-1">새로운 매뉴얼 프로젝트를 시작하세요</span>
        </Link>
      </div>

      {/* 빈 상태 */}
      {filteredWorkspaces.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            검색 결과가 없습니다
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            다른 검색어로 다시 시도해보세요.
          </p>
        </div>
      )}
    </div>
  );
}
