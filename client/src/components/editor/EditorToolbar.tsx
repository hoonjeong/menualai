import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Type,
  Image,
  FileText,
  MoreVertical,
  Check,
  Loader2,
} from 'lucide-react';
import { useEditorStore } from '../../stores';
import type { BlockType } from '../../types';
import clsx from 'clsx';

interface EditorToolbarProps {
  onSave?: () => Promise<void>;
}

export function EditorToolbar({ onSave }: EditorToolbarProps) {
  const navigate = useNavigate();
  const {
    documentTitle,
    setDocumentTitle,
    isDirty,
    isSaving,
    addBlock,
    setSaving,
  } = useEditorStore();

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // 저장 처리
  const handleSave = async () => {
    if (isSaving) return;

    setSaving(true);
    try {
      if (onSave) {
        await onSave();
      } else {
        // 임시 저장 시뮬레이션
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      // 저장 완료 후 dirty 플래그 해제는 onSave에서 처리
    } catch (error) {
      console.error('저장 실패:', error);
    } finally {
      setSaving(false);
    }
  };

  // 블록 추가
  const handleAddBlock = (type: BlockType) => {
    addBlock(type);
    setShowAddMenu(false);
  };

  // 키보드 단축키 (Ctrl+S)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const blockTypes = [
    { type: 'text' as BlockType, icon: Type, label: '텍스트' },
    { type: 'image' as BlockType, icon: Image, label: '이미지' },
    { type: 'file' as BlockType, icon: FileText, label: '파일' },
  ];

  return (
    <div
      className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* 왼쪽: 뒤로가기 + 제목 */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {isEditingTitle ? (
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditingTitle(false);
              }}
              className="text-xl font-semibold bg-transparent border-b-2 border-primary-500 focus:outline-none px-1"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              className="text-xl font-semibold cursor-pointer hover:text-primary-600 transition-colors"
            >
              {documentTitle || '제목 없음'}
            </h1>
          )}

          {/* 저장 상태 표시 */}
          {isDirty && (
            <span className="text-sm text-gray-500">• 저장되지 않음</span>
          )}
        </div>

        {/* 오른쪽: 액션 버튼 */}
        <div className="flex items-center gap-2">
          {/* 블록 추가 버튼 */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                showAddMenu
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              )}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">블록 추가</span>
            </button>

            {/* 블록 타입 선택 드롭다운 */}
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                {blockTypes.map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => handleAddBlock(type)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              isDirty
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-not-allowed'
            )}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isDirty ? (
              <Save className="w-4 h-4" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span className="text-sm">
              {isSaving ? '저장 중...' : isDirty ? '저장' : '저장됨'}
            </span>
          </button>

          {/* 더보기 메뉴 */}
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
