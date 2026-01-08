import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  FolderOpen,
  Settings,
  Users,
  ChevronRight,
  GripVertical,
  Loader2,
  X,
  Trash2,
  UserPlus,
  Crown,
} from 'lucide-react';
import clsx from 'clsx';
import { workspaceApi, categoryApi, documentApi, type Category as ApiCategory, type WorkspaceMember } from '../api/client';
import { toast } from '../stores';

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'documents' | 'members' | 'settings'>('documents');
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 모달 상태
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // 폼 상태
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [documentForm, setDocumentForm] = useState({ title: '', description: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'viewer' });
  const [settingsForm, setSettingsForm] = useState({ name: '', description: '', icon: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    async function loadWorkspace() {
      if (!id) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await workspaceApi.get(Number(id));
        const { categories: _, members: __, ...workspaceData } = response.workspace;
        setWorkspace(workspaceData as Workspace);
        setMembers(response.workspace.members || []);
        setSettingsForm({
          name: response.workspace.name || '',
          description: response.workspace.description || '',
          icon: response.workspace.icon || '',
        });

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

  // 카테고리 생성
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !categoryForm.name.trim()) return;

    setFormLoading(true);
    setFormError(null);

    try {
      const response = await categoryApi.create({
        workspaceId: Number(id),
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
      });
      setCategories([...categories, { ...response.category, documents: [] }]);
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '' });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '카테고리 생성에 실패했습니다.');
    } finally {
      setFormLoading(false);
    }
  };

  // 문서 생성
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId || !documentForm.title.trim()) return;

    setFormLoading(true);
    setFormError(null);

    try {
      const response = await documentApi.create({
        categoryId: selectedCategoryId,
        title: documentForm.title.trim(),
        description: documentForm.description.trim(),
      });
      // 새 문서로 이동
      navigate(`/document/${response.document.id}/edit`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '문서 생성에 실패했습니다.');
      setFormLoading(false);
    }
  };

  // 멤버 초대
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !inviteForm.email.trim()) return;

    setFormLoading(true);
    setFormError(null);

    try {
      await workspaceApi.addMember(Number(id), {
        email: inviteForm.email.trim(),
        role: inviteForm.role,
      });
      // 멤버 목록 새로고침
      const response = await workspaceApi.get(Number(id));
      setMembers(response.workspace.members || []);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'viewer' });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '멤버 초대에 실패했습니다.');
    } finally {
      setFormLoading(false);
    }
  };

  // 멤버 제거
  const handleRemoveMember = async (userId: number) => {
    if (!id || !confirm('정말로 이 멤버를 제거하시겠습니까?')) return;

    try {
      await workspaceApi.removeMember(Number(id), userId);
      setMembers(members.filter((m) => m.id !== userId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '멤버 제거에 실패했습니다.');
    }
  };

  // 카테고리 삭제
  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('정말로 이 카테고리를 삭제하시겠습니까? 포함된 모든 문서도 삭제됩니다.')) return;

    try {
      await categoryApi.delete(categoryId);
      setCategories(categories.filter((c) => c.id !== categoryId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '카테고리 삭제에 실패했습니다.');
    }
  };

  // 문서 추가 모달 열기
  const openDocumentModal = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setDocumentForm({ title: '', description: '' });
    setFormError(null);
    setShowDocumentModal(true);
  };

  // 워크스페이스 설정 저장
  const handleSaveSettings = async () => {
    if (!id || !settingsForm.name.trim()) return;

    setFormLoading(true);
    setSettingsSaved(false);

    try {
      await workspaceApi.update(Number(id), {
        name: settingsForm.name.trim(),
        description: settingsForm.description.trim(),
        icon: settingsForm.icon.trim() || undefined,
      });
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              name: settingsForm.name.trim(),
              description: settingsForm.description.trim(),
              icon: settingsForm.icon.trim(),
            }
          : null
      );
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '설정 저장에 실패했습니다.');
    } finally {
      setFormLoading(false);
    }
  };

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
          <button
            className="btn-secondary"
            onClick={() => {
              setInviteForm({ email: '', role: 'viewer' });
              setFormError(null);
              setShowInviteModal(true);
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            멤버 초대
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              setCategoryForm({ name: '', description: '' });
              setFormError(null);
              setShowCategoryModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            새 카테고리
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
                    <button
                      className="btn-ghost p-2"
                      onClick={() => openDocumentModal(category.id)}
                      title="새 문서 추가"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      className="btn-ghost p-2 text-red-500 hover:text-red-600"
                      onClick={() => handleDeleteCategory(category.id)}
                      title="카테고리 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
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
                      <button
                        className="text-sm text-primary-600 hover:text-primary-700 mt-1"
                        onClick={() => openDocumentModal(category.id)}
                      >
                        + 새 문서 추가
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* 새 카테고리 추가 */}
          <button
            className="w-full card p-4 border-2 border-dashed text-gray-500 hover:text-gray-700 hover:border-primary-500 transition-colors flex items-center justify-center gap-2"
            onClick={() => {
              setCategoryForm({ name: '', description: '' });
              setFormError(null);
              setShowCategoryModal(true);
            }}
          >
            <Plus className="w-5 h-5" />
            <span>새 카테고리 추가</span>
          </button>
        </div>
      )}

      {/* 멤버 탭 */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">멤버 ({members.length}명)</h2>
            <button
              className="btn-primary"
              onClick={() => {
                setInviteForm({ email: '', role: 'viewer' });
                setFormError(null);
                setShowInviteModal(true);
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              멤버 초대
            </button>
          </div>

          <div className="card divide-y divide-gray-200 dark:divide-gray-700">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <span className="text-primary-600 dark:text-primary-400 font-medium">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.name}</span>
                      {member.role === 'admin' && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <span className="text-sm text-gray-500">{member.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={clsx(
                      'text-xs px-2 py-1 rounded-full',
                      member.role === 'admin'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : member.role === 'editor'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : member.role === 'writer'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    )}
                  >
                    {member.role === 'admin'
                      ? '관리자'
                      : member.role === 'editor'
                      ? '편집자'
                      : member.role === 'writer'
                      ? '작성자'
                      : '열람자'}
                  </span>
                  {workspace?.ownerId !== member.id && (
                    <button
                      className="btn-ghost p-2 text-red-500 hover:text-red-600"
                      onClick={() => handleRemoveMember(member.id)}
                      title="멤버 제거"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>아직 멤버가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 설정 탭 */}
      {activeTab === 'settings' && (
        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-semibold">워크스페이스 설정</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                워크스페이스 이름 *
              </label>
              <input
                type="text"
                className="input"
                value={settingsForm.name}
                onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                placeholder="워크스페이스 이름"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                설명
              </label>
              <textarea
                className="input"
                rows={3}
                value={settingsForm.description}
                onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                placeholder="워크스페이스 설명"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                아이콘
              </label>
              <input
                type="text"
                className="input w-20"
                value={settingsForm.icon}
                onChange={(e) => setSettingsForm({ ...settingsForm, icon: e.target.value })}
                placeholder="📁"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              className="btn-primary"
              onClick={handleSaveSettings}
              disabled={formLoading || !settingsForm.name.trim()}
            >
              {formLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : settingsSaved ? (
                '저장됨!'
              ) : (
                '설정 저장'
              )}
            </button>
          </div>
        </div>
      )}

      {/* 카테고리 생성 모달 */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">새 카테고리</h3>
              <button
                className="btn-ghost p-2"
                onClick={() => setShowCategoryModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-4 space-y-4">
              {formError && (
                <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  카테고리 이름 *
                </label>
                <input
                  type="text"
                  className="input"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                  }
                  placeholder="예: 운영 매뉴얼"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  설명
                </label>
                <textarea
                  className="input"
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                  placeholder="카테고리에 대한 설명"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCategoryModal(false)}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formLoading || !categoryForm.name.trim()}
                >
                  {formLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    '생성'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 문서 생성 모달 */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">새 문서</h3>
              <button
                className="btn-ghost p-2"
                onClick={() => setShowDocumentModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDocument} className="p-4 space-y-4">
              {formError && (
                <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  문서 제목 *
                </label>
                <input
                  type="text"
                  className="input"
                  value={documentForm.title}
                  onChange={(e) =>
                    setDocumentForm({ ...documentForm, title: e.target.value })
                  }
                  placeholder="예: 신입사원 온보딩 가이드"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  설명
                </label>
                <textarea
                  className="input"
                  rows={2}
                  value={documentForm.description}
                  onChange={(e) =>
                    setDocumentForm({ ...documentForm, description: e.target.value })
                  }
                  placeholder="문서에 대한 간단한 설명"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowDocumentModal(false)}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formLoading || !documentForm.title.trim()}
                >
                  {formLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    '생성 및 편집'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 멤버 초대 모달 */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">멤버 초대</h3>
              <button
                className="btn-ghost p-2"
                onClick={() => setShowInviteModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInviteMember} className="p-4 space-y-4">
              {formError && (
                <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  이메일 주소 *
                </label>
                <input
                  type="email"
                  className="input"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                  placeholder="member@example.com"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  역할
                </label>
                <select
                  className="input"
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, role: e.target.value })
                  }
                >
                  <option value="viewer">열람자 - 문서 열람만 가능</option>
                  <option value="writer">작성자 - 문서 작성 가능</option>
                  <option value="editor">편집자 - 문서 편집 가능</option>
                  <option value="admin">관리자 - 모든 권한</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowInviteModal(false)}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formLoading || !inviteForm.email.trim()}
                >
                  {formLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    '초대'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
