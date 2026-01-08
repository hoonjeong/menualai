import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, MoreVertical, Users, FileText, Loader2, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { useWorkspaceStore, toast } from '../stores';
import { workspaceApi } from '../api/client';

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
  const { workspaces: storeWorkspaces, isLoading, fetchWorkspaces, removeWorkspace, updateWorkspace } = useWorkspaceStore();

  // 드롭다운 메뉴 상태
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 이름 변경 모달 상태
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<WorkspaceWithStatus | null>(null);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // 삭제 모달 상태
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceWithStatus | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

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

  // 이름 변경 핸들러
  const handleRename = async () => {
    if (!renameTarget || !newName.trim()) return;

    setIsRenaming(true);
    try {
      await workspaceApi.update(renameTarget.id, { name: newName.trim() });
      updateWorkspace(renameTarget.id, { name: newName.trim() });
      setRenameModalOpen(false);
      setRenameTarget(null);
      setNewName('');
    } catch (err) {
      toast.error('이름 변경에 실패했습니다.');
    } finally {
      setIsRenaming(false);
    }
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await workspaceApi.delete(deleteTarget.id);
      removeWorkspace(deleteTarget.id);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      toast.error('삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 스토어 데이터를 UI 형식으로 변환
  const workspaces: WorkspaceWithStatus[] = storeWorkspaces.map((ws) => ({
    id: ws.id,
    name: ws.name,
    description: ws.description || '',
    icon: ws.icon || '📁',
    status: 'active' as const,
    memberCount: ws.memberCount || 1,
    documentCount: ws.documentCount || 0,
    categories: [],
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
              <div className="relative" ref={openMenuId === workspace.id ? menuRef : null}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === workspace.id ? null : workspace.id);
                  }}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>

                {/* 드롭다운 메뉴 */}
                {openMenuId === workspace.id && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                    <div className="py-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setRenameTarget(workspace);
                          setNewName(workspace.name);
                          setRenameModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Pencil className="w-4 h-4" />
                        이름 변경
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setDeleteTarget(workspace);
                          setDeleteModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
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

      {/* 이름 변경 모달 */}
      {renameModalOpen && renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setRenameModalOpen(false);
              setRenameTarget(null);
              setNewName('');
            }}
          />
          <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">사업 이름 변경</h2>
              <button
                onClick={() => {
                  setRenameModalOpen(false);
                  setRenameTarget(null);
                  setNewName('');
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  새 이름
                </label>
                <input
                  type="text"
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="사업 이름을 입력하세요"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setRenameModalOpen(false);
                    setRenameTarget(null);
                    setNewName('');
                  }}
                  className="btn-secondary"
                >
                  취소
                </button>
                <button
                  onClick={handleRename}
                  disabled={isRenaming || !newName.trim()}
                  className="btn-primary"
                >
                  {isRenaming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  변경
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setDeleteModalOpen(false);
              setDeleteTarget(null);
            }}
          />
          <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="text-lg font-semibold">사업 삭제</h2>
              </div>
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteTarget(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>"{deleteTarget.name}"</strong>을(를) 삭제하시겠습니까?
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  이 작업은 되돌릴 수 없습니다. 모든 카테고리와 문서가 함께 삭제됩니다.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDeleteTarget(null);
                  }}
                  className="btn-secondary"
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="btn-primary bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
