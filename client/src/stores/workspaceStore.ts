import { create } from 'zustand';
import type { Workspace, Category, Document } from '../types';
import { workspaceApi } from '../api/client';

interface WorkspaceState {
  // 현재 선택된 항목
  currentWorkspace: Workspace | null;
  currentCategory: Category | null;
  currentDocument: Document | null;

  // 목록 데이터
  workspaces: Workspace[];
  categories: Category[];
  documents: Document[];
  recentDocuments: Array<{
    id: number;
    title: string;
    workspaceName: string;
    updatedAt: string;
  }>;

  // 로딩 상태
  isLoading: boolean;
  error: string | null;

  // Async Actions (API)
  fetchWorkspaces: () => Promise<void>;
  fetchRecentDocuments: () => Promise<void>;

  // Actions
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setCurrentCategory: (category: Category | null) => void;
  setCurrentDocument: (document: Document | null) => void;

  setWorkspaces: (workspaces: Workspace[]) => void;
  setCategories: (categories: Category[]) => void;
  setDocuments: (documents: Document[]) => void;

  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: number, data: Partial<Workspace>) => void;
  removeWorkspace: (id: number) => void;

  addCategory: (category: Category) => void;
  updateCategory: (id: number, data: Partial<Category>) => void;
  removeCategory: (id: number) => void;
  reorderCategories: (categories: Category[]) => void;

  addDocument: (document: Document) => void;
  updateDocument: (id: number, data: Partial<Document>) => void;
  removeDocument: (id: number) => void;

  setLoading: (loading: boolean) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  currentWorkspace: null,
  currentCategory: null,
  currentDocument: null,
  workspaces: [] as Workspace[],
  categories: [] as Category[],
  documents: [] as Document[],
  recentDocuments: [] as Array<{
    id: number;
    title: string;
    workspaceName: string;
    updatedAt: string;
  }>,
  isLoading: false,
  error: null as string | null,
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  ...initialState,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await workspaceApi.list();
      set({ workspaces: response.workspaces, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '워크스페이스를 불러오는데 실패했습니다.',
        isLoading: false,
      });
    }
  },

  fetchRecentDocuments: async () => {
    // 최근 문서는 로컬 스토리지에서 관리하거나
    // 별도 API endpoint가 필요함
    // 현재는 빈 배열로 초기화
    set({ recentDocuments: [] });
  },

  clearError: () => set({ error: null }),

  setCurrentWorkspace: (workspace) => set({
    currentWorkspace: workspace,
    currentCategory: null,
    currentDocument: null,
    categories: [],
    documents: [],
  }),

  setCurrentCategory: (category) => set({
    currentCategory: category,
    currentDocument: null,
  }),

  setCurrentDocument: (document) => set({ currentDocument: document }),

  setWorkspaces: (workspaces) => set({ workspaces }),
  setCategories: (categories) => set({ categories }),
  setDocuments: (documents) => set({ documents }),

  addWorkspace: (workspace) => set((state) => ({
    workspaces: [...state.workspaces, workspace]
  })),

  updateWorkspace: (id, data) => set((state) => ({
    workspaces: state.workspaces.map((w) =>
      w.id === id ? { ...w, ...data } : w
    ),
    currentWorkspace: state.currentWorkspace?.id === id
      ? { ...state.currentWorkspace, ...data }
      : state.currentWorkspace,
  })),

  removeWorkspace: (id) => set((state) => ({
    workspaces: state.workspaces.filter((w) => w.id !== id),
    currentWorkspace: state.currentWorkspace?.id === id
      ? null
      : state.currentWorkspace,
  })),

  addCategory: (category) => set((state) => ({
    categories: [...state.categories, category]
  })),

  updateCategory: (id, data) => set((state) => ({
    categories: state.categories.map((c) =>
      c.id === id ? { ...c, ...data } : c
    ),
  })),

  removeCategory: (id) => set((state) => ({
    categories: state.categories.filter((c) => c.id !== id),
    currentCategory: state.currentCategory?.id === id
      ? null
      : state.currentCategory,
  })),

  reorderCategories: (categories) => set({ categories }),

  addDocument: (document) => set((state) => ({
    documents: [...state.documents, document]
  })),

  updateDocument: (id, data) => set((state) => ({
    documents: state.documents.map((d) =>
      d.id === id ? { ...d, ...data } : d
    ),
    currentDocument: state.currentDocument?.id === id
      ? { ...state.currentDocument, ...data }
      : state.currentDocument,
  })),

  removeDocument: (id) => set((state) => ({
    documents: state.documents.filter((d) => d.id !== id),
    currentDocument: state.currentDocument?.id === id
      ? null
      : state.currentDocument,
  })),

  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set(initialState),
}));
