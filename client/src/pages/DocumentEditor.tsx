import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Editor } from '../components/editor';
import { documentApi } from '../api/client';
import type { Document, Block } from '../types';

export function DocumentEditor() {
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);

  // 문서 로드
  useEffect(() => {
    const loadDocument = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await documentApi.get(Number(id));
        const doc = response.document;

        // API 응답을 Document 타입으로 변환
        setDocument({
          id: doc.id,
          categoryId: doc.categoryId,
          title: doc.title,
          status: doc.status,
          visibility: 'private',
          createdBy: doc.authorId,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        });

        // 블록 데이터 변환
        setBlocks(
          doc.blocks.map((block) => ({
            id: block.id,
            documentId: block.documentId,
            blockType: block.blockType,
            content: block.content,
            sortOrder: block.sortOrder,
            createdAt: block.createdAt,
            updatedAt: block.updatedAt,
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : '문서를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [id]);

  // 저장 핸들러
  const handleSave = async (updatedDoc: Document, updatedBlocks: Block[]) => {
    if (!id) return;

    try {
      // 문서 제목 업데이트
      if (updatedDoc.title !== document?.title) {
        await documentApi.update(Number(id), {
          title: updatedDoc.title,
          status: updatedDoc.status,
        });
      }

      // 블록 저장
      await documentApi.saveBlocks(Number(id), {
        blocks: updatedBlocks.map((block) => ({
          blockType: block.blockType,
          content: block.content,
        })),
        createVersion: true,
      });

      // 로컬 상태 업데이트
      setDocument(updatedDoc);
      setBlocks(updatedBlocks);

      console.log('Document saved successfully!');
    } catch (err) {
      console.error('Failed to save document:', err);
      throw err;
    }
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            오류가 발생했습니다
          </h1>
          <p className="text-red-500 mt-2">{error}</p>
          <Link to="/" className="text-primary-600 hover:underline mt-4 inline-block">
            홈으로 돌아가기
          </Link>
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
          <Link to="/" className="text-primary-600 hover:underline mt-4 inline-block">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // 문서 다시 로드 (버전 복원 후)
  const handleReload = () => {
    if (!id) return;

    setIsLoading(true);
    documentApi.get(Number(id))
      .then((response) => {
        const doc = response.document;
        setDocument({
          id: doc.id,
          categoryId: doc.categoryId,
          title: doc.title,
          status: doc.status,
          visibility: 'private',
          createdBy: doc.authorId,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        });
        setBlocks(
          doc.blocks.map((block) => ({
            id: block.id,
            documentId: block.documentId,
            blockType: block.blockType,
            content: block.content,
            sortOrder: block.sortOrder,
            createdAt: block.createdAt,
            updatedAt: block.updatedAt,
          }))
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '문서를 불러오는데 실패했습니다.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return <Editor document={document} blocks={blocks} onSave={handleSave} onReload={handleReload} />;
}
