import { useEffect } from 'react';
import { useEditorStore } from '../../stores';
import { EditorToolbar } from './EditorToolbar';
import { BlockList } from './BlockList';
import { AddBlockButton } from './AddBlockButton';
import type { Document, Block } from '../../types';

interface EditorProps {
  document?: Document;
  blocks?: Block[];
  onSave?: (document: Document, blocks: Block[]) => Promise<void>;
}

export function Editor({ document, blocks: initialBlocks, onSave }: EditorProps) {
  const {
    setDocument,
    setBlocks,
    blocks,
    documentTitle,
    setDirty,
    reset,
  } = useEditorStore();

  // 초기 데이터 로드
  useEffect(() => {
    if (document) {
      setDocument(document);
    }
    if (initialBlocks) {
      setBlocks(initialBlocks);
    }

    // 컴포넌트 언마운트 시 상태 초기화
    return () => {
      reset();
    };
  }, [document, initialBlocks, setDocument, setBlocks, reset]);

  // 저장 핸들러
  const handleSave = async () => {
    if (onSave && document) {
      const updatedDocument = {
        ...document,
        title: documentTitle,
      };
      await onSave(updatedDocument, blocks);
      setDirty(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* 툴바 */}
      <EditorToolbar onSave={handleSave} />

      {/* 에디터 본문 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 블록 리스트 */}
        <BlockList />

        {/* 블록 추가 버튼 */}
        <AddBlockButton />
      </div>
    </div>
  );
}
