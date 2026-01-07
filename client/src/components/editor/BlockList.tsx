import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState } from 'react';
import { useEditorStore } from '../../stores';
import { TextBlock } from './blocks/TextBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { FileBlock } from './blocks/FileBlock';
import type { Block } from '../../types';

// 블록 타입에 따른 컴포넌트 렌더링
function renderBlock(block: Block) {
  switch (block.blockType) {
    case 'text':
      return <TextBlock key={block.id} block={block} />;
    case 'image':
      return <ImageBlock key={block.id} block={block} />;
    case 'file':
      return <FileBlock key={block.id} block={block} />;
    default:
      return null;
  }
}

export function BlockList() {
  const { blocks, reorderBlocks, selectBlock } = useEditorStore();
  const [activeId, setActiveId] = useState<number | null>(null);

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 드래그 시작
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  // 드래그 종료
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      reorderBlocks(active.id as number, over.id as number);
    }
  };

  // 빈 영역 클릭 시 선택 해제
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectBlock(null);
    }
  };

  // 활성 드래그 중인 블록
  const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={blocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="space-y-2 min-h-[200px] py-4"
          onClick={handleContainerClick}
        >
          {blocks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>아직 내용이 없습니다.</p>
              <p className="text-sm mt-1">아래 버튼을 눌러 블록을 추가하세요.</p>
            </div>
          ) : (
            blocks.map((block) => renderBlock(block))
          )}
        </div>
      </SortableContext>

      {/* 드래그 오버레이 */}
      <DragOverlay>
        {activeBlock ? (
          <div className="opacity-80 shadow-lg rounded-lg">
            {renderBlock(activeBlock)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
