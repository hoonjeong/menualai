import { useEffect, useRef } from 'react';
import { Copy, Trash2, Type, Image, FileText } from 'lucide-react';
import { useEditorStore } from '../../../stores';
import type { BlockType } from '../../../types';
import clsx from 'clsx';

interface BlockMenuProps {
  blockId: number;
  blockType: BlockType;
  onClose: () => void;
}

export function BlockMenu({ blockId, blockType, onClose }: BlockMenuProps) {
  const { deleteBlock, duplicateBlock, updateBlock } = useEditorStore();
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleDelete = () => {
    deleteBlock(blockId);
    onClose();
  };

  const handleDuplicate = () => {
    duplicateBlock(blockId);
    onClose();
  };

  const handleChangeType = (newType: BlockType) => {
    if (newType !== blockType) {
      updateBlock(blockId, {
        blockType: newType,
        content: newType === 'text' ? '' : undefined,
        fileUrl: undefined,
        fileName: undefined,
        fileSize: undefined,
      });
    }
    onClose();
  };

  const menuItems = [
    {
      icon: Copy,
      label: '복제',
      onClick: handleDuplicate,
    },
    { divider: true },
    {
      icon: Type,
      label: '텍스트로 변환',
      onClick: () => handleChangeType('text'),
      disabled: blockType === 'text',
    },
    {
      icon: Image,
      label: '이미지로 변환',
      onClick: () => handleChangeType('image'),
      disabled: blockType === 'image',
    },
    {
      icon: FileText,
      label: '파일로 변환',
      onClick: () => handleChangeType('file'),
      disabled: blockType === 'file',
    },
    { divider: true },
    {
      icon: Trash2,
      label: '삭제',
      onClick: handleDelete,
      danger: true,
    },
  ];

  return (
    <div
      ref={menuRef}
      className="absolute left-0 top-full mt-1 z-50 w-48 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
    >
      {menuItems.map((item, index) => {
        if ('divider' in item) {
          return (
            <div
              key={index}
              className="my-1 border-t border-gray-200 dark:border-gray-700"
            />
          );
        }

        return (
          <button
            key={index}
            onClick={item.onClick}
            disabled={item.disabled}
            className={clsx(
              'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
              item.disabled
                ? 'text-gray-400 cursor-not-allowed'
                : item.danger
                ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
