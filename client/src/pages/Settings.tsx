import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Bell,
  Palette,
  Shield,
  Key,
  Loader2,
  Check,
  Moon,
  Sun,
  Monitor,
  AlertTriangle,
  X,
  Bot,
  Eye,
  EyeOff,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { authApi } from '../api/client';
import {
  setGeminiApiKey,
  getStoredApiKey,
  clearGeminiApiKey,
  hasStoredApiKey,
  isApiKeyConfigured,
} from '../api/gemini';

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'security' | 'api';

export function Settings() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // 프로필 폼 상태
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    organization: (user as { organization?: string })?.organization || '',
  });

  // 비밀번호 변경 폼 상태
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 계정 삭제 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 알림 설정 상태 (localStorage에서 로드)
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          emailNotifications: true,
          documentUpdates: true,
          memberInvites: true,
          weeklyDigest: false,
        };
      }
    }
    return {
      emailNotifications: true,
      documentUpdates: true,
      memberInvites: true,
      weeklyDigest: false,
    };
  });
  const [notificationSaveSuccess, setNotificationSaveSuccess] = useState(false);

  // API 키 설정 상태
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(isApiKeyConfigured());
  const [storedApiKeyDisplay, setStoredApiKeyDisplay] = useState(getStoredApiKey());
  const [apiKeySaveSuccess, setApiKeySaveSuccess] = useState(false);

  // 사용자 정보가 변경되면 폼 업데이트
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        organization: (user as { organization?: string })?.organization || '',
      });
    }
  }, [user]);

  const tabs = [
    { id: 'profile' as const, label: '프로필', icon: User },
    { id: 'appearance' as const, label: '외관', icon: Palette },
    { id: 'notifications' as const, label: '알림', icon: Bell },
    { id: 'security' as const, label: '보안', icon: Shield },
    { id: 'api' as const, label: 'AI 설정', icon: Bot },
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setProfileError(null);

    try {
      const response = await authApi.updateProfile({
        name: profileForm.name.trim(),
        organization: profileForm.organization.trim(),
      });

      // 사용자 정보 업데이트
      setUser(response.user);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : '프로필 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    // 비밀번호 확인
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setIsChangingPassword(true);

    try {
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 2000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    if (!deletePassword) {
      setDeleteError('비밀번호를 입력해주세요.');
      return;
    }

    setIsDeleting(true);

    try {
      await authApi.deleteAccount(deletePassword);
      logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : '계정 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    setGeminiApiKey(apiKeyInput.trim());
    setApiKeyConfigured(true);
    setStoredApiKeyDisplay(getStoredApiKey());
    setApiKeyInput('');
    setApiKeySaveSuccess(true);
    setTimeout(() => setApiKeySaveSuccess(false), 2000);
  };

  const handleClearApiKey = () => {
    clearGeminiApiKey();
    setApiKeyConfigured(isApiKeyConfigured());
    setStoredApiKeyDisplay('');
  };

  const handleSaveNotifications = () => {
    localStorage.setItem('notificationSettings', JSON.stringify(notifications));
    setNotificationSaveSuccess(true);
    setTimeout(() => setNotificationSaveSuccess(false), 2000);
  };

  const themeOptions = [
    { value: 'light' as const, label: '라이트', icon: Sun },
    { value: 'dark' as const, label: '다크', icon: Moon },
    { value: 'system' as const, label: '시스템', icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-gray-500 mt-1">계정 및 앱 설정을 관리합니다.</p>
      </div>

      <div className="flex gap-6">
        {/* 사이드 탭 */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1">
          {/* 프로필 탭 */}
          {activeTab === 'profile' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-6">프로필 정보</h2>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    이름
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={profileForm.name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    이메일
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={profileForm.email}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, email: e.target.value })
                    }
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    이메일은 변경할 수 없습니다.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    소속
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={profileForm.organization}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, organization: e.target.value })
                    }
                    placeholder="회사 또는 조직명"
                  />
                </div>
                {profileError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                    {profileError}
                  </div>
                )}
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : saveSuccess ? (
                      <Check className="w-4 h-4 mr-2" />
                    ) : null}
                    {saveSuccess ? '저장됨' : '저장'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 외관 탭 */}
          {activeTab === 'appearance' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-6">외관 설정</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    테마
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {themeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value)}
                        className={clsx(
                          'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                          theme === option.value
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                      >
                        <option.icon
                          className={clsx(
                            'w-6 h-6',
                            theme === option.value
                              ? 'text-primary-600'
                              : 'text-gray-500'
                          )}
                        />
                        <span
                          className={clsx(
                            'text-sm font-medium',
                            theme === option.value
                              ? 'text-primary-600'
                              : 'text-gray-700 dark:text-gray-300'
                          )}
                        >
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 알림 탭 */}
          {activeTab === 'notifications' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-6">알림 설정</h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                  <div>
                    <span className="font-medium">이메일 알림</span>
                    <p className="text-sm text-gray-500">중요한 업데이트를 이메일로 받습니다.</p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded text-primary-600"
                    checked={notifications.emailNotifications}
                    onChange={(e) =>
                      setNotifications({ ...notifications, emailNotifications: e.target.checked })
                    }
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                  <div>
                    <span className="font-medium">문서 업데이트 알림</span>
                    <p className="text-sm text-gray-500">내 문서가 수정되면 알림을 받습니다.</p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded text-primary-600"
                    checked={notifications.documentUpdates}
                    onChange={(e) =>
                      setNotifications({ ...notifications, documentUpdates: e.target.checked })
                    }
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                  <div>
                    <span className="font-medium">멤버 초대 알림</span>
                    <p className="text-sm text-gray-500">워크스페이스에 초대되면 알림을 받습니다.</p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded text-primary-600"
                    checked={notifications.memberInvites}
                    onChange={(e) =>
                      setNotifications({ ...notifications, memberInvites: e.target.checked })
                    }
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                  <div>
                    <span className="font-medium">주간 요약</span>
                    <p className="text-sm text-gray-500">매주 활동 요약을 이메일로 받습니다.</p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded text-primary-600"
                    checked={notifications.weeklyDigest}
                    onChange={(e) =>
                      setNotifications({ ...notifications, weeklyDigest: e.target.checked })
                    }
                  />
                </label>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                {notificationSaveSuccess && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
                    알림 설정이 저장되었습니다.
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotifications}
                    className="btn-primary"
                  >
                    {notificationSaveSuccess ? (
                      <Check className="w-4 h-4 mr-2" />
                    ) : null}
                    {notificationSaveSuccess ? '저장됨' : '설정 저장'}
                  </button>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-400">
                * 알림 설정은 현재 브라우저에만 저장됩니다.
              </p>
            </div>
          )}

          {/* 보안 탭 */}
          {activeTab === 'security' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-6">보안 설정</h2>
              <div className="space-y-6">
                <form onSubmit={handleChangePassword}>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    비밀번호 변경
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        현재 비밀번호
                      </label>
                      <input
                        type="password"
                        className="input"
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        새 비밀번호
                      </label>
                      <input
                        type="password"
                        className="input"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                        }
                        required
                        minLength={6}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        새 비밀번호 확인
                      </label>
                      <input
                        type="password"
                        className="input"
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                        }
                        required
                      />
                    </div>
                    {passwordError && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                        {passwordError}
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
                        비밀번호가 변경되었습니다.
                      </div>
                    )}
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={isChangingPassword}
                      >
                        {isChangingPassword ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : passwordSuccess ? (
                          <Check className="w-4 h-4 mr-2" />
                        ) : null}
                        {passwordSuccess ? '변경됨' : '비밀번호 변경'}
                      </button>
                    </div>
                  </div>
                </form>

                <hr className="border-gray-200 dark:border-gray-700" />

                <div>
                  <h3 className="font-medium mb-3 text-red-600">위험 구역</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.
                  </p>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="btn-secondary text-red-600 border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                  >
                    계정 삭제
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI 설정 탭 */}
          {activeTab === 'api' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-6">AI 설정</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    Gemini API 키
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    AI 챗봇 기능을 사용하려면 Google Gemini API 키가 필요합니다.
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline ml-1"
                    >
                      API 키 발급받기
                    </a>
                  </p>

                  {/* 현재 상태 표시 */}
                  <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">현재 상태:</span>
                      {apiKeyConfigured ? (
                        <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          {hasStoredApiKey() ? '사용자 키 설정됨' : '환경 변수 키 사용 중'}
                        </span>
                      ) : (
                        <span className="text-sm text-yellow-600 dark:text-yellow-400">
                          설정 안됨
                        </span>
                      )}
                    </div>
                    {storedApiKeyDisplay && (
                      <div className="mt-2 text-sm text-gray-500">
                        저장된 키: <code className="font-mono">{storedApiKeyDisplay}</code>
                      </div>
                    )}
                  </div>

                  {/* API 키 입력 폼 */}
                  <form onSubmit={handleSaveApiKey} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {hasStoredApiKey() ? '새 API 키 입력' : 'API 키 입력'}
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          className="input pr-10"
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          placeholder="AIza..."
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {apiKeySaveSuccess && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
                        API 키가 저장되었습니다.
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={!apiKeyInput.trim()}
                      >
                        {apiKeySaveSuccess ? (
                          <Check className="w-4 h-4 mr-2" />
                        ) : null}
                        {apiKeySaveSuccess ? '저장됨' : '저장'}
                      </button>
                      {hasStoredApiKey() && (
                        <button
                          type="button"
                          onClick={handleClearApiKey}
                          className="btn-secondary text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          키 삭제
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />

                <div>
                  <h3 className="font-medium mb-2">AI 기능 안내</h3>
                  <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
                    <li>문서 편집 화면에서 AI 챗봇을 사용할 수 있습니다.</li>
                    <li>경영, 운영, 서비스 매뉴얼 관련 질문에 전문적인 답변을 제공합니다.</li>
                    <li>API 키는 브라우저에 안전하게 저장되며 서버로 전송되지 않습니다.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 계정 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowDeleteModal(false);
              setDeletePassword('');
              setDeleteError(null);
            }}
          />
          <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="text-lg font-semibold">계정 삭제</h2>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeleteError(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleDeleteAccount} className="p-6 space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>경고:</strong> 이 작업은 되돌릴 수 없습니다. 계정을 삭제하면 다음 데이터가 모두 삭제됩니다:
                </p>
                <ul className="mt-2 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                  <li>소유한 모든 워크스페이스</li>
                  <li>모든 문서 및 파일</li>
                  <li>즐겨찾기 및 설정</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  className="input"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="현재 비밀번호를 입력하세요"
                  required
                />
              </div>

              {deleteError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteError(null);
                  }}
                  className="btn-secondary"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="btn-primary bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  계정 영구 삭제
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
