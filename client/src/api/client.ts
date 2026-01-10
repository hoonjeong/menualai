/**
 * API 클라이언트 - 백엔드 서버와 통신
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Access Token은 메모리에만 저장 (localStorage 사용 안 함)
let accessToken: string | null = null;

// 토큰 갱신 중복 방지를 위한 Promise
let refreshPromise: Promise<string | null> | null = null;

/**
 * Access Token 설정 (메모리 저장)
 */
export function setAccessToken(token: string | null) {
  accessToken = token;
}

/**
 * Access Token 가져오기
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Refresh Token으로 Access Token 갱신
 */
async function refreshAccessToken(): Promise<string | null> {
  // 이미 갱신 중이면 기존 Promise 반환 (중복 요청 방지)
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // 쿠키 포함
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      accessToken = data.accessToken;
      return accessToken;
    } catch (error) {
      accessToken = null;
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * API 요청 기본 함수 (자동 토큰 갱신 포함)
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const makeRequest = async (token: string | null): Promise<Response> => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include', // 쿠키 포함
    });
  };

  let response = await makeRequest(accessToken);

  // 401 에러이고 TOKEN_EXPIRED인 경우 토큰 갱신 시도
  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}));

    if (errorData.code === 'TOKEN_EXPIRED') {
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          // 새 토큰으로 재요청
          response = await makeRequest(newToken);
        }
      } catch {
        // 갱신 실패 시 로그아웃 이벤트 발생
        window.dispatchEvent(new CustomEvent('auth:logout'));
        throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
      }
    } else {
      throw new Error(errorData.error || '인증에 실패했습니다.');
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// ============ 인증 API ============

export interface User {
  id: number;
  email: string;
  name: string;
  profileImage: string | null;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  user: User;
}

export const authApi = {
  /**
   * 회원가입
   */
  register: async (data: { email: string; password: string; name: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || '회원가입에 실패했습니다.');
    }

    const result: AuthResponse = await response.json();
    setAccessToken(result.accessToken);
    return result;
  },

  /**
   * 로그인
   */
  login: async (data: { email: string; password: string; rememberMe?: boolean }) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || '로그인에 실패했습니다.');
    }

    const result: AuthResponse = await response.json();
    setAccessToken(result.accessToken);
    return result;
  },

  /**
   * 현재 사용자 정보
   */
  me: () => request<{ user: User }>('/auth/me'),

  /**
   * 로그아웃
   */
  logout: async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setAccessToken(null);
    }
  },

  /**
   * 토큰 갱신 시도 (앱 초기화 시 사용)
   */
  refreshToken: async (): Promise<AuthResponse | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const result: AuthResponse = await response.json();
      setAccessToken(result.accessToken);
      return result;
    } catch {
      return null;
    }
  },

  /**
   * 프로필 업데이트
   */
  updateProfile: (data: { name?: string; organization?: string }) =>
    request<{ message: string; user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * 비밀번호 변경
   */
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * 계정 삭제
   */
  deleteAccount: (password: string) =>
    request<{ message: string }>('/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
};

// ============ 워크스페이스 API ============

export interface Workspace {
  id: number;
  name: string;
  description: string;
  icon: string;
  ownerId: number;
  myRole: string;
  categoryCount?: number;
  memberCount?: number;
  documentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: number;
  email: string;
  name: string;
  profileImage: string | null;
  role: string;
  joinedAt: string;
}

export const workspaceApi = {
  /**
   * 워크스페이스 목록
   */
  list: () => request<{ workspaces: Workspace[] }>('/workspaces'),

  /**
   * 워크스페이스 상세
   */
  get: (id: number) =>
    request<{ workspace: Workspace & { categories: Category[]; members: WorkspaceMember[] } }>(
      `/workspaces/${id}`
    ),

  /**
   * 워크스페이스 생성
   */
  create: (data: { name: string; description?: string; icon?: string }) =>
    request<{ workspace: Workspace }>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * 워크스페이스 수정
   */
  update: (id: number, data: { name?: string; description?: string; icon?: string }) =>
    request<{ workspace: Workspace }>(`/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * 워크스페이스 삭제
   */
  delete: (id: number) =>
    request<{ message: string }>(`/workspaces/${id}`, { method: 'DELETE' }),

  /**
   * 멤버 추가
   */
  addMember: (workspaceId: number, data: { email: string; role?: string }) =>
    request<{ message: string }>(`/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * 멤버 제거
   */
  removeMember: (workspaceId: number, userId: number) =>
    request<{ message: string }>(`/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE',
    }),
};

// ============ 카테고리 API ============

export interface Category {
  id: number;
  workspaceId: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: number;
  documentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const categoryApi = {
  /**
   * 카테고리 목록
   */
  list: (workspaceId: number) =>
    request<{ categories: Category[] }>(`/categories?workspaceId=${workspaceId}`),

  /**
   * 카테고리 상세 (문서 포함)
   */
  get: (id: number) =>
    request<{ category: Category & { documents: Document[] } }>(`/categories/${id}`),

  /**
   * 카테고리 생성
   */
  create: (data: {
    workspaceId: number;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }) =>
    request<{ category: Category }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * 카테고리 수정
   */
  update: (
    id: number,
    data: { name?: string; description?: string; icon?: string; color?: string }
  ) =>
    request<{ category: Category }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * 카테고리 삭제
   */
  delete: (id: number) =>
    request<{ message: string }>(`/categories/${id}`, { method: 'DELETE' }),
};

// ============ 문서 API ============

export interface Document {
  id: number;
  categoryId: number;
  title: string;
  description: string;
  icon: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  authorId: number;
  authorName?: string;
  sortOrder: number;
  blockCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Block {
  id: number;
  documentId: number;
  blockType: 'text' | 'image' | 'file';
  content: string;
  metadata: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: number;
  documentId: number;
  version: number;
  title: string;
  blocksSnapshot: string;
  createdBy: number;
  createdByName?: string;
  createdAt: string;
}

export const documentApi = {
  /**
   * 문서 목록
   */
  list: (categoryId: number) =>
    request<{ documents: Document[] }>(`/documents?categoryId=${categoryId}`),

  /**
   * 문서 상세 (블록 포함)
   */
  get: (id: number) =>
    request<{ document: Document & { blocks: Block[] } }>(`/documents/${id}`),

  /**
   * 문서 생성
   */
  create: (data: {
    categoryId: number;
    title: string;
    description?: string;
    icon?: string;
    status?: 'draft' | 'published' | 'archived';
  }) =>
    request<{ document: Document & { blocks: Block[] } }>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * 문서 메타데이터 수정
   */
  update: (
    id: number,
    data: {
      title?: string;
      description?: string;
      icon?: string;
      status?: 'draft' | 'published' | 'archived';
    }
  ) =>
    request<{ document: Document }>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * 문서 블록 전체 저장
   */
  saveBlocks: (
    id: number,
    data: {
      blocks: Array<{
        blockType: 'text' | 'image' | 'file';
        content?: string;
        metadata?: Record<string, unknown>;
      }>;
      createVersion?: boolean;
    }
  ) =>
    request<{ document: Document & { blocks: Block[] } }>(`/documents/${id}/blocks`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * 버전 목록
   */
  getVersions: (id: number) =>
    request<{ versions: DocumentVersion[] }>(`/documents/${id}/versions`),

  /**
   * 버전 복원
   */
  restoreVersion: (documentId: number, versionId: number) =>
    request<{ message: string }>(`/documents/${documentId}/restore/${versionId}`, {
      method: 'POST',
    }),

  /**
   * 문서 삭제
   */
  delete: (id: number) =>
    request<{ message: string }>(`/documents/${id}`, { method: 'DELETE' }),
};

// ============ 블록 API ============

export const blockApi = {
  /**
   * 블록 목록
   */
  list: (documentId: number) =>
    request<{ blocks: Block[] }>(`/blocks?documentId=${documentId}`),

  /**
   * 블록 생성
   */
  create: (data: {
    documentId: number;
    blockType: 'text' | 'image' | 'file';
    content?: string;
    metadata?: Record<string, unknown>;
    afterBlockId?: number;
  }) =>
    request<{ block: Block }>('/blocks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * 블록 수정
   */
  update: (id: number, data: { content?: string; metadata?: Record<string, unknown> }) =>
    request<{ block: Block }>(`/blocks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * 블록 삭제
   */
  delete: (id: number) =>
    request<{ message: string }>(`/blocks/${id}`, { method: 'DELETE' }),

  /**
   * 파일 업로드
   */
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/blocks/upload`, {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error);
    }

    return response.json() as Promise<{
      url: string;
      filename: string;
      size: number;
      mimetype: string;
      isImage: boolean;
    }>;
  },
};

// ============ 즐겨찾기 API ============

export interface Favorite {
  id: number;
  documentId: number;
  documentTitle: string;
  categoryName: string;
  workspaceName: string;
  createdAt: string;
}

export const favoriteApi = {
  /**
   * 즐겨찾기 목록
   */
  list: () => request<{ favorites: Favorite[] }>('/favorites'),

  /**
   * 즐겨찾기 추가
   */
  add: (documentId: number) =>
    request<{ favorite: Favorite }>('/favorites', {
      method: 'POST',
      body: JSON.stringify({ documentId }),
    }),

  /**
   * 즐겨찾기 제거
   */
  remove: (documentId: number) =>
    request<{ message: string }>(`/favorites/${documentId}`, { method: 'DELETE' }),

  /**
   * 즐겨찾기 여부 확인
   */
  check: (documentId: number) =>
    request<{ isFavorite: boolean }>(`/favorites/check/${documentId}`),
};

// ============ 헬스 체크 ============

export const healthCheck = () =>
  request<{ status: string; timestamp: string }>('/health');

// ============ 기존 localStorage 정리 (마이그레이션) ============

export function clearLegacyStorage() {
  localStorage.removeItem('token');
  localStorage.removeItem('auth-storage');
}
