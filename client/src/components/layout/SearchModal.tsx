import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, FolderOpen, X, Loader2 } from 'lucide-react';
import { workspaceApi, categoryApi } from '../../api/client';
import { useUIStore } from '../../stores';

interface SearchResult {
  type: 'document' | 'workspace';
  id: number;
  title: string;
  subtitle: string;
  path: string;
}

export function SearchModal() {
  const navigate = useNavigate();
  const { searchOpen, setSearchOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        navigate(results[selectedIndex].path);
        setSearchOpen(false);
      }
    };

    if (searchOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [searchOpen, setSearchOpen, results, selectedIndex, navigate]);

  // Cmd/Ctrl + K로 모달 열기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  // 검색 실행
  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // 워크스페이스 검색
      const workspacesResponse = await workspaceApi.list();
      const q = searchQuery.toLowerCase();

      for (const ws of workspacesResponse.workspaces) {
        // 워크스페이스 이름 검색
        if (ws.name.toLowerCase().includes(q) || ws.description?.toLowerCase().includes(q)) {
          searchResults.push({
            type: 'workspace',
            id: ws.id,
            title: ws.name,
            subtitle: ws.description || '워크스페이스',
            path: `/workspace/${ws.id}`,
          });
        }

        // 문서 검색
        try {
          const wsDetail = await workspaceApi.get(ws.id);
          for (const category of wsDetail.workspace.categories || []) {
            try {
              const catDetail = await categoryApi.get(category.id);
              for (const doc of catDetail.category.documents || []) {
                if (doc.title.toLowerCase().includes(q)) {
                  searchResults.push({
                    type: 'document',
                    id: doc.id,
                    title: doc.title,
                    subtitle: `${ws.name} / ${category.name}`,
                    path: `/document/${doc.id}/edit`,
                  });
                }
              }
            } catch {
              // 카테고리 접근 실패 무시
            }
          }
        } catch {
          // 워크스페이스 상세 접근 실패 무시
        }
      }

      setResults(searchResults.slice(0, 10)); // 최대 10개 결과
      setSelectedIndex(0);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 디바운스된 검색
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [searchOpen]);

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* 배경 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setSearchOpen(false)}
      />

      {/* 모달 */}
      <div className="relative w-full max-w-xl mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* 검색 입력 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
            placeholder="문서, 워크스페이스 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {isLoading && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
          <button
            onClick={() => setSearchOpen(false)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* 검색 결과 */}
        <div className="max-h-[50vh] overflow-y-auto">
          {query && results.length === 0 && !isLoading ? (
            <div className="py-8 text-center text-gray-500">
              <Search className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => {
                    navigate(result.path);
                    setSearchOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      result.type === 'document'
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-green-100 dark:bg-green-900/30'
                    }`}
                  >
                    {result.type === 'document' ? (
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <FolderOpen className="w-4 h-4 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {result.title}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 하단 도움말 */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-500">
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd> 이동
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> 선택
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> 닫기
          </span>
        </div>
      </div>
    </div>
  );
}
