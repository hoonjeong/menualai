import { create } from 'zustand';
import type { Block, BlockType, Document } from '../types';

interface EditorState {
  // 현재 문서
  document: Document | null;
  documentTitle: string;

  // 블록 데이터
  blocks: Block[];
  selectedBlockId: number | null;

  // 상태
  isDirty: boolean;
  isSaving: boolean;
  isEditing: boolean;

  // Actions - Document
  setDocument: (document: Document | null) => void;
  setDocumentTitle: (title: string) => void;

  // Actions - Blocks
  setBlocks: (blocks: Block[]) => void;
  addBlock: (type: BlockType, afterId?: number) => void;
  updateBlock: (id: number, data: Partial<Block>) => void;
  deleteBlock: (id: number) => void;
  duplicateBlock: (id: number) => void;
  reorderBlocks: (activeId: number, overId: number) => void;

  // Actions - Selection
  selectBlock: (id: number | null) => void;

  // Actions - State
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  setEditing: (editing: boolean) => void;

  // Reset
  reset: () => void;
}

// 임시 ID 생성 (실제로는 서버에서 생성)
let tempIdCounter = 1000;
const generateTempId = () => ++tempIdCounter;

const initialState = {
  document: null,
  documentTitle: '',
  blocks: [],
  selectedBlockId: null,
  isDirty: false,
  isSaving: false,
  isEditing: false,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,

  // Document Actions
  setDocument: (document) => set({
    document,
    documentTitle: document?.title || '',
    isDirty: false,
  }),

  setDocumentTitle: (title) => set({
    documentTitle: title,
    isDirty: true,
  }),

  // Block Actions
  setBlocks: (blocks) => set({ blocks }),

  addBlock: (type, afterId) => {
    const { blocks } = get();

    // 새 블록 생성
    const newBlock: Block = {
      id: generateTempId(),
      documentId: get().document?.id || 0,
      blockType: type,
      content: type === 'text' ? '' : undefined,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let newBlocks: Block[];
    if (afterId !== undefined) {
      // 특정 블록 다음에 추가
      const afterIndex = blocks.findIndex((b) => b.id === afterId);
      if (afterIndex !== -1) {
        newBlocks = [
          ...blocks.slice(0, afterIndex + 1),
          newBlock,
          ...blocks.slice(afterIndex + 1),
        ];
      } else {
        newBlocks = [...blocks, newBlock];
      }
    } else {
      // 맨 끝에 추가
      newBlocks = [...blocks, newBlock];
    }

    // sortOrder 재계산
    newBlocks = newBlocks.map((block, index) => ({
      ...block,
      sortOrder: index,
    }));

    set({
      blocks: newBlocks,
      selectedBlockId: newBlock.id,
      isDirty: true,
    });
  },

  updateBlock: (id, data) => {
    const { blocks } = get();
    const newBlocks = blocks.map((block) =>
      block.id === id
        ? { ...block, ...data, updatedAt: new Date().toISOString() }
        : block
    );
    set({ blocks: newBlocks, isDirty: true });
  },

  deleteBlock: (id) => {
    const { blocks, selectedBlockId } = get();
    const newBlocks = blocks
      .filter((block) => block.id !== id)
      .map((block, index) => ({ ...block, sortOrder: index }));

    set({
      blocks: newBlocks,
      selectedBlockId: selectedBlockId === id ? null : selectedBlockId,
      isDirty: true,
    });
  },

  duplicateBlock: (id) => {
    const { blocks } = get();
    const blockIndex = blocks.findIndex((b) => b.id === id);
    if (blockIndex === -1) return;

    const originalBlock = blocks[blockIndex];
    const newBlock: Block = {
      ...originalBlock,
      id: generateTempId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newBlocks = [
      ...blocks.slice(0, blockIndex + 1),
      newBlock,
      ...blocks.slice(blockIndex + 1),
    ].map((block, index) => ({ ...block, sortOrder: index }));

    set({
      blocks: newBlocks,
      selectedBlockId: newBlock.id,
      isDirty: true,
    });
  },

  reorderBlocks: (activeId, overId) => {
    const { blocks } = get();
    const oldIndex = blocks.findIndex((b) => b.id === activeId);
    const newIndex = blocks.findIndex((b) => b.id === overId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(oldIndex, 1);
    newBlocks.splice(newIndex, 0, removed);

    // sortOrder 재계산
    const reorderedBlocks = newBlocks.map((block, index) => ({
      ...block,
      sortOrder: index,
    }));

    set({ blocks: reorderedBlocks, isDirty: true });
  },

  // Selection Actions
  selectBlock: (id) => set({ selectedBlockId: id }),

  // State Actions
  setDirty: (isDirty) => set({ isDirty }),
  setSaving: (isSaving) => set({ isSaving }),
  setEditing: (isEditing) => set({ isEditing }),

  // Reset
  reset: () => set(initialState),
}));
