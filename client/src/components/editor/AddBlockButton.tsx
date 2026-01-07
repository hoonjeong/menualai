import { useState } from 'react';
import { Plus, Type, Image, FileText } from 'lucide-react';
import { useEditorStore } from '../../stores';
import type { BlockType } from '../../types';
import clsx from 'clsx';

export function AddBlockButton() {
  const { addBlock } = useEditorStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const blockTypes = [
    { type: 'text' as BlockType, icon: Type, label: '텍스트', desc: '텍스트를 입력하세요' },
    { type: 'image' as BlockType, icon: Image, label: '이미지', desc: '이미지를 업로드하세요' },
    { type: 'file' as BlockType, icon: FileText, label: '파일', desc: '파일을 첨부하세요' },
  ];

  const handleAddBlock = (type: BlockType) => {
    addBlock(type);
    setIsExpanded(false);
  };

  return (
    <div className="mt-4">
      {isExpanded ? (
        <div className="flex flex-wrap gap-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          {blockTypes.map(({ type, icon: Icon, label, desc }) => (
            <button
              key={type}
              onClick={() => handleAddBlock(type)}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                'hover:border-primary-500 hover:shadow-sm'
              )}
            >
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </button>
          ))}

          <button
            onClick={() => setIsExpanded(false)}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            취소
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className={clsx(
            'w-full flex items-center justify-center gap-2 py-3',
            'border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg',
            'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            'hover:border-gray-400 dark:hover:border-gray-500 transition-colors'
          )}
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">블록 추가</span>
        </button>
      )}
    </div>
  );
}
