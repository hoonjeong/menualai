import { useState, useRef, useCallback } from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  Upload,
  Download,
  X,
} from 'lucide-react';
import { useEditorStore } from '../../../stores';
import { BaseBlock } from './BaseBlock';
import type { Block } from '../../../types';
import clsx from 'clsx';

interface FileBlockProps {
  block: Block;
}

// 파일 타입에 따른 아이콘
const getFileIcon = (fileName?: string) => {
  if (!fileName) return File;

  const ext = fileName.split('.').pop()?.toLowerCase();

  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext || '')) {
    return FileText;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) {
    return FileSpreadsheet;
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) {
    return FileImage;
  }
  if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(ext || '')) {
    return FileVideo;
  }
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext || '')) {
    return FileAudio;
  }

  return File;
};

export function FileBlock({ block }: FileBlockProps) {
  const { updateBlock } = useEditorStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasFile = !!block.fileUrl;
  const FileIcon = getFileIcon(block.fileName);

  // 파일 선택 처리
  const handleFileSelect = useCallback(async (file: File) => {
    // 이미지 파일은 ImageBlock 사용 권장
    if (file.type.startsWith('image/')) {
      const useImageBlock = confirm('이미지 파일입니다. 이미지 블록으로 변환할까요?');
      if (useImageBlock) {
        updateBlock(block.id, { blockType: 'image' });
      }
    }

    setIsUploading(true);

    try {
      // 로컬 미리보기를 위한 Data URL 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        updateBlock(block.id, {
          fileUrl: dataUrl,
          fileName: file.name,
          fileSize: file.size,
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);

      // TODO: 실제 서버 업로드 구현
    } catch (error) {
      console.error('파일 업로드 실패:', error);
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

  // 파일 삭제
  const handleRemoveFile = () => {
    updateBlock(block.id, {
      fileUrl: undefined,
      fileName: undefined,
      fileSize: undefined,
    });
  };

  // 파일 다운로드
  const handleDownload = () => {
    if (block.fileUrl) {
      const link = document.createElement('a');
      link.href = block.fileUrl;
      link.download = block.fileName || 'download';
      link.click();
    }
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <BaseBlock block={block}>
      {hasFile ? (
        <div className="block-file group/file">
          {/* 파일 아이콘 */}
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <FileIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>

          {/* 파일 정보 */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {block.fileName}
            </p>
            <p className="text-sm text-gray-500">{formatFileSize(block.fileSize)}</p>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity">
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="다운로드"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleRemoveFile}
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
              title="삭제"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'flex items-center gap-4 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
            isDragOver
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          )}
        >
          {isUploading ? (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">업로드 중...</p>
            </div>
          ) : (
            <>
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                {isDragOver ? (
                  <Upload className="w-5 h-5 text-primary-500" />
                ) : (
                  <File className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isDragOver ? '파일을 놓으세요' : '파일을 드래그하거나 클릭하세요'}
                </p>
                <p className="text-xs text-gray-500">모든 파일 형식 지원</p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleInputChange}
        className="hidden"
      />
    </BaseBlock>
  );
}
