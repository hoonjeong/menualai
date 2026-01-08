import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderOpen,
  FileText,
  Clock,
  Star,
  Plus,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useWorkspaceStore, useAuthStore } from '../stores';
import { favoriteApi, type Favorite } from '../api/client';

// 상대적인 시간 표시 함수
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
}

export function Dashboard() {
  const { user } = useAuthStore();
  const {
    workspaces,
    recentDocuments,
    isLoading,
    fetchWorkspaces,
    fetchRecentDocuments,
  } = useWorkspaceStore();

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);

  useEffect(() => {
    fetchWorkspaces().then(() => {
      fetchRecentDocuments();
    });

    // 즐겨찾기 로드
    favoriteApi
      .list()
      .then((response) => {
        setFavorites(response.favorites);
      })
      .catch((err) => {
        console.error('Failed to load favorites:', err);
      })
      .finally(() => {
        setFavoritesLoading(false);
      });
  }, [fetchWorkspaces, fetchRecentDocuments]);

  // 통계 데이터 (실제 데이터 기반)
  const stats = [
    { label: '사업', value: workspaces.length, icon: FolderOpen, color: 'text-blue-600' },
    { label: '문서', value: recentDocuments.length, icon: FileText, color: 'text-green-600' },
    { label: '즐겨찾기', value: favorites.length, icon: Star, color: 'text-yellow-600' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 환영 메시지 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            안녕하세요, {user?.name || '사용자'}님
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            오늘도 효율적인 매뉴얼 관리를 시작해보세요.
          </p>
        </div>
        <Link to="/workspace/new" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          새 사업 만들기
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gray-100 dark:bg-gray-800 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 편집 문서 */}
        <div className="card">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              <h2 className="font-semibold">최근 편집한 문서</h2>
            </div>
            <Link
              to="/documents"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              전체 보기
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentDocuments.length > 0 ? (
              recentDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/document/${doc.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-sm text-gray-500">{doc.workspaceName}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-400">{formatRelativeTime(doc.updatedAt)}</span>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>최근 편집한 문서가 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 즐겨찾기 */}
        <div className="card">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <h2 className="font-semibold">즐겨찾기</h2>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {favoritesLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : favorites.length > 0 ? (
              favorites.slice(0, 5).map((fav) => (
                <Link
                  key={fav.id}
                  to={`/document/${fav.documentId}/edit`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <div>
                      <p className="font-medium">{fav.documentTitle}</p>
                      <p className="text-sm text-gray-500">
                        {fav.workspaceName} / {fav.categoryName}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Star className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>즐겨찾기한 문서가 없습니다.</p>
                <p className="text-sm mt-1">문서를 즐겨찾기에 추가해보세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 사업 목록 */}
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold">내 사업</h2>
          </div>
          <Link
            to="/workspaces"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            전체 보기
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.slice(0, 5).map((workspace) => (
            <Link
              key={workspace.id}
              to={`/workspace/${workspace.id}`}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{workspace.icon || '📁'}</span>
                <h3 className="font-semibold">{workspace.name}</h3>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2">
                {workspace.description || '설명 없음'}
              </p>
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-400">
                <span>{(workspace as { categories?: unknown[] }).categories?.length || 0}개 카테고리</span>
              </div>
            </Link>
          ))}

          {/* 새 사업 만들기 */}
          <Link
            to="/workspace/new"
            className="p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all flex flex-col items-center justify-center text-gray-500"
          >
            <Plus className="w-8 h-8 mb-2" />
            <span className="font-medium">새 사업 만들기</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
