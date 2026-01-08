import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  ChevronRight,
  Loader2,
  FolderOpen,
  Clock,
  Star,
  MoreVertical,
  Send,
  Archive,
  FileEdit,
} from 'lucide-react';
import clsx from 'clsx';
import { workspaceApi, categoryApi, favoriteApi, documentApi } from '../api/client';
import { toast } from '../stores';

interface DocumentItem {
  id: number;
  title: string;
  status: string;
  categoryName: string;
  workspaceName: string;
  workspaceId: number;
  updatedAt: string;
  isFavorite?: boolean;
}

export function Documents() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadAllDocuments() {
      setIsLoading(true);

      try {
        // 즐겨찾기 목록 로드
        const favoritesResponse = await favoriteApi.list();
        const favIds = new Set(favoritesResponse.favorites.map((f) => f.documentId));
        setFavoriteIds(favIds);

        // 모든 워크스페이스 가져오기
        const workspacesResponse = await workspaceApi.list();
        const allDocs: DocumentItem[] = [];

        // 각 워크스페이스의 카테고리와 문서 가져오기
        for (const workspace of workspacesResponse.workspaces) {
          try {
            const wsDetail = await workspaceApi.get(workspace.id);
            for (const category of wsDetail.workspace.categories || []) {
              try {
                const catDetail = await categoryApi.get(category.id);
                for (const doc of catDetail.category.documents || []) {
                  allDocs.push({
                    id: doc.id,
                    title: doc.title,
                    status: doc.status,
                    categoryName: category.name,
                    workspaceName: workspace.name,
                    workspaceId: workspace.id,
                    updatedAt: doc.updatedAt,
                    isFavorite: favIds.has(doc.id),
                  });
                }
              } catch {
                // 카테고리 접근 실패 무시
              }
            }
          } catch {
            // 워크스페이스 접근 실패 무시
          }
        }

        // 최신순 정렬
        allDocs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setDocuments(allDocs);
      } catch (err) {
        console.error('Failed to load documents:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAllDocuments();
  }, []);

  // 메뉴 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 즐겨찾기 토글
  const toggleFavorite = async (e: React.MouseEvent, docId: number) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (favoriteIds.has(docId)) {
        await favoriteApi.remove(docId);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(docId);
          return next;
        });
      } else {
        await favoriteApi.add(docId);
        setFavoriteIds((prev) => new Set(prev).add(docId));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  // 문서 상태 변경
  const changeDocumentStatus = async (
    e: React.MouseEvent,
    docId: number,
    newStatus: 'draft' | 'published' | 'archived'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);

    try {
      await documentApi.update(docId, { status: newStatus });
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === docId ? { ...doc, status: newStatus } : doc))
      );
    } catch (err) {
      console.error('Failed to change status:', err);
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  // 필터링된 문서
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.workspaceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes}분 전`;
      }
      return `${hours}시간 전`;
    } else if (days === 1) {
      return '어제';
    } else if (days < 7) {
      return `${days}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR');
    }
  };

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
          <h1 className="text-2xl font-bold">모든 문서</h1>
          <p className="text-gray-500 mt-1">전체 {documents.length}개의 문서</p>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="문서 제목, 카테고리, 워크스페이스 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            className="input pl-10 pr-8 appearance-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">모든 상태</option>
            <option value="draft">초안</option>
            <option value="published">게시됨</option>
            <option value="archived">보관됨</option>
          </select>
        </div>
      </div>

      {/* 문서 목록 */}
      {filteredDocuments.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {searchTerm || statusFilter !== 'all' ? '검색 결과가 없습니다' : '문서가 없습니다'}
          </h3>
          <p className="text-gray-500 mt-2">
            {searchTerm || statusFilter !== 'all'
              ? '다른 검색어나 필터를 사용해보세요.'
              : '워크스페이스에서 새 문서를 만들어보세요.'}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-200 dark:divide-gray-700">
          {filteredDocuments.map((doc) => (
            <Link
              key={doc.id}
              to={`/document/${doc.id}/edit`}
              className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{doc.title}</h3>
                    <span
                      className={clsx(
                        'text-xs px-2 py-0.5 rounded-full flex-shrink-0',
                        doc.status === 'published'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : doc.status === 'archived'
                          ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      )}
                    >
                      {doc.status === 'published'
                        ? '게시됨'
                        : doc.status === 'archived'
                        ? '보관됨'
                        : '초안'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <FolderOpen className="w-3 h-3" />
                    <span className="truncate">
                      {doc.workspaceName} / {doc.categoryName}
                    </span>
                    <span className="mx-1">·</span>
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(doc.updatedAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={(e) => toggleFavorite(e, doc.id)}
                  className={clsx(
                    'p-2 rounded-lg transition-colors',
                    favoriteIds.has(doc.id)
                      ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                      : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                  title={favoriteIds.has(doc.id) ? '즐겨찾기 제거' : '즐겨찾기 추가'}
                >
                  <Star
                    className={clsx(
                      'w-5 h-5',
                      favoriteIds.has(doc.id) && 'fill-yellow-500'
                    )}
                  />
                </button>
                {/* 상태 변경 메뉴 */}
                <div className="relative" ref={openMenuId === doc.id ? menuRef : null}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === doc.id ? null : doc.id);
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="상태 변경"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {openMenuId === doc.id && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                      <div className="py-1">
                        {doc.status !== 'draft' && (
                          <button
                            onClick={(e) => changeDocumentStatus(e, doc.id, 'draft')}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <FileEdit className="w-4 h-4" />
                            초안으로 변경
                          </button>
                        )}
                        {doc.status !== 'published' && (
                          <button
                            onClick={(e) => changeDocumentStatus(e, doc.id, 'published')}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Send className="w-4 h-4" />
                            게시하기
                          </button>
                        )}
                        {doc.status !== 'archived' && (
                          <button
                            onClick={(e) => changeDocumentStatus(e, doc.id, 'archived')}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Archive className="w-4 h-4" />
                            보관하기
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
