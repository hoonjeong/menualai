import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// 카테고리 정보를 camelCase로 변환
function formatCategory(c) {
  if (!c) return null;
  return {
    id: c.id,
    workspaceId: c.workspace_id,
    name: c.name,
    description: c.description,
    sortOrder: c.sort_order,
    documentCount: c.document_count,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

/**
 * 워크스페이스 접근 권한 확인 헬퍼
 */
function checkWorkspaceAccess(userId, workspaceId, requiredRole = 'viewer') {
  const roleOrder = { viewer: 0, writer: 1, editor: 2, admin: 3, owner: 4 };

  const access = db.prepare(`
    SELECT
      CASE WHEN w.owner_id = ? THEN 'owner' ELSE wm.role END as role
    FROM workspaces w
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
    WHERE w.id = ? AND (w.owner_id = ? OR wm.user_id = ?)
  `).get(userId, userId, workspaceId, userId, userId);

  if (!access) return null;

  const hasAccess = roleOrder[access.role] >= roleOrder[requiredRole];
  return hasAccess ? access.role : null;
}

/**
 * GET /api/categories - 워크스페이스의 카테고리 목록
 */
router.get('/', authenticate, (req, res, next) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId가 필요합니다.' });
    }

    const role = checkWorkspaceAccess(req.user.id, workspaceId);
    if (!role) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    const categories = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM documents WHERE category_id = c.id) as document_count
      FROM categories c
      WHERE c.workspace_id = ?
      ORDER BY c.sort_order ASC
    `).all(workspaceId);

    res.json({ categories: categories.map(formatCategory) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/categories/:id - 카테고리 상세 (문서 목록 포함)
 */
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!category) {
      return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
    }

    const role = checkWorkspaceAccess(req.user.id, category.workspace_id);
    if (!role) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    // 문서 목록
    const documents = db.prepare(`
      SELECT d.*, u.name as author_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.category_id = ?
      ORDER BY d.id ASC
    `).all(id);

    const formattedDocuments = documents.map(d => ({
      id: d.id,
      categoryId: d.category_id,
      title: d.title,
      status: d.status,
      visibility: d.visibility,
      authorId: d.created_by,
      authorName: d.author_name,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    res.json({
      category: {
        ...formatCategory(category),
        documents: formattedDocuments,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/categories - 카테고리 생성
 */
router.post('/', authenticate, (req, res, next) => {
  try {
    const { workspaceId, name, description } = req.body;

    if (!workspaceId || !name) {
      return res.status(400).json({ error: 'workspaceId와 name은 필수입니다.' });
    }

    const role = checkWorkspaceAccess(req.user.id, workspaceId, 'editor');
    if (!role) {
      return res.status(403).json({ error: '카테고리 생성 권한이 없습니다.' });
    }

    // 다음 sortOrder 계산
    const maxOrder = db.prepare(`
      SELECT MAX(sort_order) as maxOrder FROM categories WHERE workspace_id = ?
    `).get(workspaceId);
    const sortOrder = (maxOrder?.maxOrder || 0) + 1;

    const result = db.prepare(`
      INSERT INTO categories (workspace_id, name, description, sort_order)
      VALUES (?, ?, ?, ?)
    `).run(workspaceId, name, description || '', sortOrder);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json({ category: formatCategory(category) });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/categories/:id - 카테고리 수정
 */
router.put('/:id', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!category) {
      return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
    }

    const role = checkWorkspaceAccess(req.user.id, category.workspace_id, 'editor');
    if (!role) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    db.prepare(`
      UPDATE categories
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, description, id);

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json({ category: formatCategory(updated) });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/categories/:id - 카테고리 삭제
 */
router.delete('/:id', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!category) {
      return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
    }

    const role = checkWorkspaceAccess(req.user.id, category.workspace_id, 'admin');
    if (!role) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    // 트랜잭션으로 관련 데이터 모두 삭제
    const deleteAll = db.transaction(() => {
      // 블록 삭제
      db.prepare(`
        DELETE FROM blocks WHERE document_id IN (
          SELECT id FROM documents WHERE category_id = ?
        )
      `).run(id);

      // 문서 버전 삭제
      db.prepare(`
        DELETE FROM document_versions WHERE document_id IN (
          SELECT id FROM documents WHERE category_id = ?
        )
      `).run(id);

      // 문서 삭제
      db.prepare('DELETE FROM documents WHERE category_id = ?').run(id);

      // 카테고리 삭제
      db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    });

    deleteAll();

    res.json({ message: '카테고리가 삭제되었습니다.' });
  } catch (error) {
    next(error);
  }
});

export default router;
