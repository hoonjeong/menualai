/**
 * API 클라이언트 - 백엔드 서버와 통신
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// 토큰 저장소
let authToken: string | null = localStorage.getItem('token');

/**
 * 인증 토큰 설정
 */
export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

/**
 * 인증 토큰 가져오기
 */
export function getAuthToken(): string | null {
  return authToken;
}

/**
 * API 요청 기본 함수
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

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
  token: string;
  user: User;
}

export const authApi = {
  /**
   * 회원가입
   */
  register: (data: { email: string; password: string; name: string }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * 로그인
   */
  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * 현재 사용자 정보
   */
  me: () => request<{ user: User }>('/auth/me'),

  /**
   * 로그아웃
   */
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
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
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: formData,
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

// ============ 헬스 체크 ============

export const healthCheck = () =>
  request<{ status: string; timestamp: string }>('/health');
