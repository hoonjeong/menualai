import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import { workspaceApi } from '../api/client';

export function WorkspaceNew() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('사업명을 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await workspaceApi.create({
        name: name.trim(),
        description: description.trim(),
      });
      navigate(`/workspace/${response.workspace.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '사업 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/workspaces" className="hover:text-gray-700 dark:hover:text-gray-300">
          사업 목록
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 dark:text-gray-100">새 사업 만들기</span>
      </nav>

      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">새 사업 만들기</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          새로운 매뉴얼 프로젝트를 시작하세요.
        </p>
      </div>

      {/* 폼 */}
      <div className="card p-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 사업명 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              사업명 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="예: 2024년 신규 서비스 매뉴얼"
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              설명
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-h-[100px] resize-none"
              placeholder="이 사업에 대한 간단한 설명을 입력하세요."
              rows={3}
            />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link to="/workspaces" className="btn-secondary">
              취소
            </Link>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                '사업 만들기'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
