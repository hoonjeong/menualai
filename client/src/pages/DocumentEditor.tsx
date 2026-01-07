import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Editor } from '../components/editor';
import type { Document, Block } from '../types';

// 샘플 데이터 (API 연동 전 테스트용)
const sampleDocuments: Record<number, { document: Document; blocks: Block[] }> = {
  1: {
    document: {
      id: 1,
      categoryId: 1,
      title: '오픈 체크리스트',
      status: 'published',
      visibility: 'private',
      createdBy: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    blocks: [
      {
        id: 1,
        documentId: 1,
        blockType: 'text',
        content: '# 매장 오픈 체크리스트\n\n매일 아침 오픈 전 확인해야 할 사항들입니다.',
        sortOrder: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        documentId: 1,
        blockType: 'text',
        content: '## 1. 전기 및 설비 점검\n\n1. 메인 전원 ON\n2. 에어컨/난방 가동\n3. 조명 점검',
        sortOrder: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 3,
        documentId: 1,
        blockType: 'text',
        content: '## 2. 커피 머신 준비\n\n1. 머신 전원 ON (예열 15분)\n2. 물통 확인\n3. 원두 충전',
        sortOrder: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 4,
        documentId: 1,
        blockType: 'text',
        content: '## 3. 재료 점검\n\n- 우유 재고 확인\n- 시럽류 확인\n- 컵/빨대 확인',
        sortOrder: 3,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
  },
  3: {
    document: {
      id: 3,
      categoryId: 2,
      title: '아메리카노 제조법',
      status: 'published',
      visibility: 'public_free',
      createdBy: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    blocks: [
      {
        id: 10,
        documentId: 3,
        blockType: 'text',
        content: '# 아메리카노 제조법\n\n기본 아메리카노 제조 가이드입니다.',
        sortOrder: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 11,
        documentId: 3,
        blockType: 'text',
        content: '## 재료\n\n- 에스프레소 샷: 2샷 (약 30ml)\n- 정수물: 150ml (아이스의 경우 얼음 + 물 120ml)',
        sortOrder: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 12,
        documentId: 3,
        blockType: 'text',
        content: '## HOT 아메리카노\n\n1. 컵에 뜨거운 물 150ml를 먼저 담습니다\n2. 에스프레소 2샷을 추출하여 위에 부어줍니다\n3. 가볍게 저어 섞어줍니다',
        sortOrder: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 13,
        documentId: 3,
        blockType: 'text',
        content: '## ICE 아메리카노\n\n1. 컵에 얼음을 가득 채웁니다\n2. 차가운 물 120ml를 넣습니다\n3. 에스프레소 2샷을 추출하여 위에 부어줍니다',
        sortOrder: 3,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
  },
};

// 새 문서 생성용 기본 데이터
const createNewDocument = (id: number): { document: Document; blocks: Block[] } => ({
  document: {
    id,
    categoryId: 1,
    title: '새 문서',
    status: 'draft',
    visibility: 'private',
    createdBy: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  blocks: [
    {
      id: Date.now(),
      documentId: id,
      blockType: 'text',
      content: '',
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
});

export function DocumentEditor() {
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [document, setDocument] = useState<Document | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);

  // 문서 로드
  useEffect(() => {
    const loadDocument = async () => {
      setIsLoading(true);

      // 시뮬레이션: API 호출 대기
      await new Promise((resolve) => setTimeout(resolve, 300));

      const docId = Number(id);

      // 샘플 데이터에서 찾기
      const data = sampleDocuments[docId] || createNewDocument(docId);

      setDocument(data.document);
      setBlocks(data.blocks);
      setIsLoading(false);
    };

    loadDocument();
  }, [id]);

  // 저장 핸들러
  const handleSave = async (updatedDoc: Document, updatedBlocks: Block[]) => {
    // TODO: API 호출로 실제 저장
    console.log('Saving document:', updatedDoc);
    console.log('Saving blocks:', updatedBlocks);

    // 시뮬레이션: API 호출 대기
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 로컬 상태 업데이트
    setDocument(updatedDoc);
    setBlocks(updatedBlocks);

    console.log('Document saved successfully!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">문서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            문서를 찾을 수 없습니다
          </h1>
          <p className="text-gray-500 mt-2">요청한 문서가 존재하지 않거나 접근 권한이 없습니다.</p>
        </div>
      </div>
    );
  }

  return <Editor document={document} blocks={blocks} onSave={handleSave} />;
}
