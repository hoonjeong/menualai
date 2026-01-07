import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Plus,
  FileText,
  FolderOpen,
  Settings,
  Users,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { workspaceApi, categoryApi, type Category as ApiCategory } from '../api/client';

interface Category extends ApiCategory {
  documents: { id: number; title: string; status: string }[];
}

interface Workspace {
  id: number;
  name: string;
  description: string;
  icon: string;
  ownerId: number;
  myRole?: string;
  categories?: Category[];
}

export function WorkspaceDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'documents' | 'members' | 'settings'>('documents');
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWorkspace() {
      if (!id) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await workspaceApi.get(Number(id));
        setWorkspace(response.workspace);

        // 각 카테고리의 문서 목록 로드
        const categoriesWithDocs: Category[] = [];
        for (const cat of response.workspace.categories || []) {
          try {
            const catDetail = await categoryApi.get(cat.id);
            categoriesWithDocs.push({
              ...cat,
              documents: catDetail.category.documents || [],
            });
          } catch {
            categoriesWithDocs.push({
              ...cat,
              documents: [],
            });
          }
        }
        setCategories(categoriesWithDocs);
      } catch (err) {
        setError(err instanceof Error ? err.message : '워크스페이스를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadWorkspace();
  }, [id]);

  const tabs = [
    { id: 'documents', label: '문서', icon: FileText },
    { id: 'members', label: '멤버', icon: Users },
    { id: 'settings', label: '설정', icon: Settings },
  ] as const;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error || '워크스페이스를 찾을 수 없습니다.'}</p>
        <Link to="/workspaces" className="text-primary-600 hover:underline">
          사업 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/workspaces" className="hover:text-gray-700 dark:hover:text-gray-300">
          사업 목록
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 dark:text-gray-100">{workspace.name}</span>
      </nav>

      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{workspace.icon || '📁'}</span>
          <div>
            <h1 className="text-2xl font-bold">{workspace.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {workspace.description || '설명 없음'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">
            <Users className="w-4 h-4 mr-2" />
            멤버 초대
          </button>
          <button className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            새 문서
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 문서 탭 내용 */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {categories.length === 0 ? (
            <div className="card p-8 text-center text-gray-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>아직 카테고리가 없습니다.</p>
              <p className="text-sm mt-1">새 카테고리를 추가해서 문서를 정리하세요.</p>
            </div>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="card overflow-hidden">
                {/* 카테고리 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                    <FolderOpen className="w-5 h-5 text-gray-500" />
                    <div>
                      <h3 className="font-semibold">{category.name}</h3>
                      <p className="text-sm text-gray-500">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn-ghost p-2">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button className="btn-ghost p-2">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 문서 목록 */}
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {category.documents.map((doc) => (
                    <Link
                      key={doc.id}
                      to={`/document/${doc.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{doc.title}</span>
                        <span
                          className={clsx(
                            'text-xs px-2 py-0.5 rounded-full',
                            doc.status === 'published'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          )}
                        >
                          {doc.status === 'published' ? '게시됨' : '초안'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                  ))}

                  {category.documents.length === 0 && (
                    <div className="px-4 py-6 text-center text-gray-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">문서가 없습니다.</p>
                      <button className="text-sm text-primary-600 hover:text-primary-700 mt-1">
                        + 새 문서 추가
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* 새 카테고리 추가 */}
          <button className="w-full card p-4 border-2 border-dashed text-gray-500 hover:text-gray-700 hover:border-primary-500 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            <span>새 카테고리 추가</span>
          </button>
        </div>
      )}

      {/* 멤버 탭 */}
      {activeTab === 'members' && (
        <div className="card p-6">
          <p className="text-gray-500 text-center">멤버 관리 기능은 곧 제공될 예정입니다.</p>
        </div>
      )}

      {/* 설정 탭 */}
      {activeTab === 'settings' && (
        <div className="card p-6">
          <p className="text-gray-500 text-center">설정 기능은 곧 제공될 예정입니다.</p>
        </div>
      )}
    </div>
  );
}
