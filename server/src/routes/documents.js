import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// 문서 정보를 camelCase로 변환
function formatDocument(d) {
  if (!d) return null;
  return {
    id: d.id,
    categoryId: d.category_id,
    title: d.title,
    status: d.status,
    visibility: d.visibility,
    authorId: d.created_by,
    authorName: d.author_name,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

// 블록 정보를 camelCase로 변환
function formatBlock(b) {
  if (!b) return null;
  return {
    id: b.id,
    documentId: b.document_id,
    blockType: b.block_type,
    content: b.content,
    fileUrl: b.file_url,
    fileName: b.file_name,
    fileSize: b.file_size,
    sortOrder: b.sort_order,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
}

/**
 * 문서 접근 권한 확인 헬퍼
 */
function checkDocumentAccess(userId, documentId, requiredRole = 'viewer') {
  const roleOrder = { viewer: 0, writer: 1, editor: 2, admin: 3, owner: 4 };

  const access = db.prepare(`
    SELECT
      CASE WHEN w.owner_id = ? THEN 'owner' ELSE wm.role END as role
    FROM documents d
    JOIN categories c ON d.category_id = c.id
    JOIN workspaces w ON c.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
    WHERE d.id = ? AND (w.owner_id = ? OR wm.user_id = ?)
  `).get(userId, userId, documentId, userId, userId);

  if (!access) return null;

  const hasAccess = roleOrder[access.role] >= roleOrder[requiredRole];
  return hasAccess ? access.role : null;
}

/**
 * 카테고리 접근 권한 확인 헬퍼
 */
function checkCategoryAccess(userId, categoryId, requiredRole = 'viewer') {
  const roleOrder = { viewer: 0, writer: 1, editor: 2, admin: 3, owner: 4 };

  const access = db.prepare(`
    SELECT
      CASE WHEN w.owner_id = ? THEN 'owner' ELSE wm.role END as role
    FROM categories c
    JOIN workspaces w ON c.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
    WHERE c.id = ? AND (w.owner_id = ? OR wm.user_id = ?)
  `).get(userId, userId, categoryId, userId, userId);

  if (!access) return null;

  const hasAccess = roleOrder[access.role] >= roleOrder[requiredRole];
  return hasAccess ? access.role : null;
}

/**
 * GET /api/documents - 문서 목록 (카테고리별)
 */
router.get('/', authenticate, (req, res, next) => {
  try {
    const { categoryId } = req.query;

    if (!categoryId) {
      return res.status(400).json({ error: 'categoryId가 필요합니다.' });
    }

    const role = checkCategoryAccess(req.user.id, categoryId);
    if (!role) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    const documents = db.prepare(`
      SELECT d.*, u.name as author_name,
        (SELECT COUNT(*) FROM blocks WHERE document_id = d.id) as block_count
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.category_id = ?
      ORDER BY d.id ASC
    `).all(categoryId);

    res.json({ documents: documents.map(d => ({...formatDocument(d), blockCount: d.block_count})) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/:id - 문서 상세 (블록 포함)
 */
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;

    const role = checkDocumentAccess(req.user.id, id);
    if (!role) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    const document = db.prepare(`
      SELECT d.*, u.name as author_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `).get(id);

    if (!document) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    // 블록 목록
    const blocks = db.prepare(`
      SELECT * FROM blocks
      WHERE document_id = ?
      ORDER BY sort_order ASC
    `).all(id);

    res.json({
      document: {
        ...formatDocument(document),
        blocks: blocks.map(formatBlock),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/documents - 문서 생성
 */
router.post('/', authenticate, (req, res, next) => {
  try {
    const { categoryId, title, status = 'draft' } = req.body;

    if (!categoryId || !title) {
      return res.status(400).json({ error: 'categoryId와 title은 필수입니다.' });
    }

    const role = checkCategoryAccess(req.user.id, categoryId, 'writer');
    if (!role) {
      return res.status(403).json({ error: '문서 생성 권한이 없습니다.' });
    }

    const result = db.prepare(`
      INSERT INTO documents (category_id, title, status, created_by)
      VALUES (?, ?, ?, ?)
    `).run(categoryId, title, status, req.user.id);

    const documentId = result.lastInsertRowid;

    // 기본 텍스트 블록 추가
    db.prepare(`
      INSERT INTO blocks (document_id, block_type, content, sort_order)
      VALUES (?, 'text', '', 1)
    `).run(documentId);

    const document = db.prepare(`
      SELECT d.*, u.name as author_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `).get(documentId);

    const blocks = db.prepare('SELECT * FROM blocks WHERE document_id = ?').all(documentId);

    res.status(201).json({
      document: {
        ...formatDocument(document),
        blocks: blocks.map(formatBlock),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/documents/:id - 문서 수정 (메타데이터)
 */
router.put('/:id', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, status } = req.body;

    const role = checkDocumentAccess(req.user.id, id, 'writer');
    if (!role) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    db.prepare(`
      UPDATE documents
      SET title = COALESCE(?, title),
          status = COALESCE(?, status),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(title, status, id);

    const document = db.prepare(`
      SELECT d.*, u.name as author_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `).get(id);

    res.json({ document: formatDocument(document) });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/documents/:id/blocks - 문서 블록 전체 저장
 */
router.put('/:id/blocks', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const { blocks, createVersion = false } = req.body;

    const role = checkDocumentAccess(req.user.id, id, 'writer');
    if (!role) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    // 현재 문서 정보
    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    if (!document) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    const saveBlocks = db.transaction(() => {
      // 버전 생성 (옵션)
      if (createVersion) {
        const currentBlocks = db.prepare('SELECT * FROM blocks WHERE document_id = ?').all(id);
        const versionNumber = db.prepare(`
          SELECT COALESCE(MAX(version_number), 0) + 1 as next FROM document_versions WHERE document_id = ?
        `).get(id).next;

        db.prepare(`
          INSERT INTO document_versions (document_id, version_number, snapshot, created_by)
          VALUES (?, ?, ?, ?)
        `).run(id, versionNumber, JSON.stringify(currentBlocks), req.user.id);
      }

      // 기존 블록 삭제
      db.prepare('DELETE FROM blocks WHERE document_id = ?').run(id);

      // 새 블록 삽입
      const insertBlock = db.prepare(`
        INSERT INTO blocks (document_id, block_type, content, file_url, file_name, file_size, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      blocks.forEach((block, index) => {
        insertBlock.run(
          id,
          block.blockType,
          block.content || '',
          block.fileUrl || null,
          block.fileName || null,
          block.fileSize || null,
          index + 1
        );
      });

      // 문서 업데이트 시간 갱신
      db.prepare('UPDATE documents SET updated_at = datetime("now") WHERE id = ?').run(id);
    });

    saveBlocks();

    // 업데이트된 문서 반환
    const updatedDocument = db.prepare(`
      SELECT d.*, u.name as author_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `).get(id);

    const updatedBlocks = db.prepare('SELECT * FROM blocks WHERE document_id = ? ORDER BY sort_order').all(id);

    res.json({
      document: {
        ...formatDocument(updatedDocument),
        blocks: updatedBlocks.map(formatBlock),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/:id/versions - 문서 버전 목록
 */
router.get('/:id/versions', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;

    const role = checkDocumentAccess(req.user.id, id);
    if (!role) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    const versions = db.prepare(`
      SELECT dv.*, u.name as created_by_name
      FROM document_versions dv
      LEFT JOIN users u ON dv.created_by = u.id
      WHERE dv.document_id = ?
      ORDER BY dv.version_number DESC
    `).all(id);

    res.json({
      versions: versions.map(v => ({
        id: v.id,
        documentId: v.document_id,
        version: v.version_number,
        changeSummary: v.change_summary,
        createdBy: v.created_by,
        createdByName: v.created_by_name,
        createdAt: v.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/documents/:id - 문서 삭제
 */
router.delete('/:id', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;

    const role = checkDocumentAccess(req.user.id, id, 'editor');
    if (!role) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    const deleteAll = db.transaction(() => {
      db.prepare('DELETE FROM blocks WHERE document_id = ?').run(id);
      db.prepare('DELETE FROM document_versions WHERE document_id = ?').run(id);
      db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    });

    deleteAll();

    res.json({ message: '문서가 삭제되었습니다.' });
  } catch (error) {
    next(error);
  }
});

export default router;
