import { forwardRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreHorizontal } from 'lucide-react';
import { useEditorStore } from '../../../stores';
import { BlockMenu } from './BlockMenu';
import type { Block } from '../../../types';
import clsx from 'clsx';

interface BaseBlockProps {
  block: Block;
  children: React.ReactNode;
  className?: string;
}

export const BaseBlock = forwardRef<HTMLDivElement, BaseBlockProps>(
  ({ block, children, className }, ref) => {
    const { selectedBlockId, selectBlock } = useEditorStore();
    const [showMenu, setShowMenu] = useState(false);

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: block.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const isSelected = selectedBlockId === block.id;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      selectBlock(block.id);
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={clsx(
          'group relative flex gap-2 rounded-lg transition-all',
          isDragging && 'opacity-50 z-50',
          isSelected && 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900'
        )}
        onClick={handleClick}
      >
        {/* 왼쪽 액션 영역 */}
        <div className="flex flex-col items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* 드래그 핸들 */}
          <button
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>

          {/* 더보기 메뉴 */}
          <div className="relative">
            <button
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>

            {showMenu && (
              <BlockMenu
                blockId={block.id}
                blockType={block.blockType}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        </div>

        {/* 블록 내용 */}
        <div ref={ref} className={clsx('flex-1 min-w-0', className)}>
          {children}
        </div>
      </div>
    );
  }
);

BaseBlock.displayName = 'BaseBlock';
