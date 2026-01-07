// 사용자 타입
export interface User {
  id: number;
  email: string;
  name: string;
  profileImage?: string;
  organization?: string;
  createdAt: string;
  lastLoginAt?: string;
}

// 워크스페이스 (사업) 타입
export interface Workspace {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  ownerId: number;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// 카테고리 타입
export interface Category {
  id: number;
  workspaceId: number;
  name: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 문서 (매뉴얼) 타입
export interface Document {
  id: number;
  categoryId: number;
  title: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'private' | 'public_free' | 'public_paid';
  pricePoints?: number;
  shareLink?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// 블록 타입
export type BlockType = 'text' | 'image' | 'file';

export interface Block {
  id: number;
  documentId: number;
  blockType: BlockType;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 문서 버전 타입
export interface DocumentVersion {
  id: number;
  documentId: number;
  versionNumber: number;
  snapshot: string;
  changeSummary?: string;
  createdBy: number;
  createdAt: string;
}

// 멤버 역할 타입
export type MemberRole = 'viewer' | 'writer' | 'editor' | 'admin';

// 워크스페이스 멤버 타입
export interface WorkspaceMember {
  id: number;
  workspaceId: number;
  userId: number;
  role: MemberRole;
  joinedAt: string;
  user?: User;
}

// 초대 타입
export interface Invitation {
  id: number;
  workspaceId: number;
  email: string;
  role: MemberRole;
  inviteToken: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  createdAt: string;
}

// 활동 로그 타입
export interface ActivityLog {
  id: number;
  userId?: number;
  workspaceId: number;
  actionType: 'create' | 'update' | 'delete' | 'view' | 'share' | 'permission_change';
  targetType: 'workspace' | 'category' | 'document' | 'member';
  targetId: number;
  details?: string;
  createdAt: string;
}

// AI 채팅 메시지 타입
export interface AIChatMessage {
  id: number;
  userId: number;
  documentId?: number;
  role: 'user' | 'assistant';
  message: string;
  createdAt: string;
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 페이지네이션 타입
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
