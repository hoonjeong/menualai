import { useState, useEffect } from 'react';
import { X, History, Clock, User, RotateCcw, Loader2 } from 'lucide-react';
import { documentApi, type DocumentVersion } from '../../api/client';
import { toast } from '../../stores';

interface VersionHistoryModalProps {
  documentId: number;
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
}

export function VersionHistoryModal({
  documentId,
  isOpen,
  onClose,
  onRestore,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && documentId) {
      loadVersions();
    }
  }, [isOpen, documentId]);

  const loadVersions = async () => {
    setIsLoading(true);
    try {
      const response = await documentApi.getVersions(documentId);
      setVersions(response.versions);
    } catch (err) {
      console.error('Failed to load versions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (versionId: number) => {
    if (isRestoring) return;

    const confirmed = window.confirm(
      '이 버전으로 복원하시겠습니까? 현재 저장되지 않은 변경사항은 사라집니다.'
    );

    if (!confirmed) return;

    setIsRestoring(true);
    setSelectedVersionId(versionId);
    try {
      await documentApi.restoreVersion(documentId, versionId);
      toast.success('버전이 복원되었습니다.');
      onRestore();
      onClose();
    } catch (err) {
      console.error('Failed to restore version:', err);
      toast.error('버전 복원에 실패했습니다.');
    } finally {
      setIsRestoring(false);
      setSelectedVersionId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold">버전 기록</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 내용 */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : versions.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>버전 기록이 없습니다.</p>
              <p className="text-sm mt-1">문서를 저장하면 버전이 생성됩니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          버전 {version.version}
                        </span>
                        {index === 0 && (
                          <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 rounded-full">
                            최신
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(version.createdAt)}</span>
                        </div>
                        {version.createdByName && (
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{version.createdByName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {index > 0 && (
                      <button
                        onClick={() => handleRestore(version.id)}
                        disabled={isRestoring}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isRestoring && selectedVersionId === version.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                        복원
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 안내 */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-xs text-gray-500">
            문서를 저장할 때마다 새로운 버전이 자동으로 생성됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
