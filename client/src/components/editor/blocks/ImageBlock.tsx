import { useState, useRef, useCallback } from 'react';
import { ImagePlus, X, Upload } from 'lucide-react';
import { useEditorStore, toast } from '../../../stores';
import { BaseBlock } from './BaseBlock';
import { blockApi } from '../../../api/client';
import type { Block } from '../../../types';
import clsx from 'clsx';

interface ImageBlockProps {
  block: Block;
}

export function ImageBlock({ block }: ImageBlockProps) {
  const { updateBlock } = useEditorStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasImage = !!block.fileUrl;

  // 파일 선택 처리
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    setIsUploading(true);

    try {
      // 서버에 파일 업로드
      const response = await blockApi.upload(file);

      updateBlock(block.id, {
        fileUrl: response.url,
        fileName: response.filename,
        fileSize: response.size,
      });
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      toast.error('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  }, [block.id, updateBlock]);

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 파일 입력 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 이미지 삭제
  const handleRemoveImage = () => {
    updateBlock(block.id, {
      fileUrl: undefined,
      fileName: undefined,
      fileSize: undefined,
    });
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <BaseBlock block={block} className="block-image">
      {hasImage ? (
        <div className="relative group/image">
          {/* 이미지 미리보기 */}
          <img
            src={block.fileUrl}
            alt={block.fileName || '이미지'}
            className="max-w-full h-auto rounded-lg"
          />

          {/* 이미지 정보 및 액션 오버레이 */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <div className="text-center text-white">
              <p className="text-sm font-medium">{block.fileName}</p>
              <p className="text-xs text-gray-300">{formatFileSize(block.fileSize)}</p>
              <button
                onClick={handleRemoveImage}
                className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-sm flex items-center gap-1 mx-auto"
              >
                <X className="w-4 h-4" />
                삭제
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
            isDragOver
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">업로드 중...</p>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                {isDragOver ? (
                  <Upload className="w-6 h-6 text-primary-500" />
                ) : (
                  <ImagePlus className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isDragOver ? '이미지를 놓으세요' : '이미지를 드래그하거나 클릭하세요'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF (최대 10MB)
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
    </BaseBlock>
  );
}
