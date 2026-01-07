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
async function checkDocumentAccess(userId, documentId, requiredRole = 'viewer') {
  const roleOrder = { viewer: 0, writer: 1, editor: 2, admin: 3, owner: 4 };

  const [rows] = await db.execute(`
    SELECT
      CASE WHEN w.owner_id = ? THEN 'owner' ELSE wm.role END as role
    FROM documents d
    JOIN categories c ON d.category_id = c.id
    JOIN workspaces w ON c.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
    WHERE d.id = ? AND (w.owner_id = ? OR wm.user_id = ?)
  `, [userId, userId, documentId, userId, userId]);

  if (rows.length === 0) return null;

  const hasAccess = roleOrder[rows[0].role] >= roleOrder[requiredRole];
  return hasAccess ? rows[0].role : null;
}

/**
 * 카테고리 접근 권한 확인 헬퍼
 */
async function checkCategoryAccess(userId, categoryId, requiredRole = 'viewer') {
  const roleOrder = { viewer: 0, writer: 1, editor: 2, admin: 3, owner: 4 };

  const [rows] = await db.execute(`
    SELECT
      CASE WHEN w.owner_id = ? THEN 'owner' ELSE wm.role END as role
    FROM categories c
    JOIN workspaces w ON c.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
    WHERE c.id = ? AND (w.owner_id = ? OR wm.user_id = ?)
  `, [userId, userId, categoryId, userId, userId]);

  if (rows.length === 0) return null;

  const hasAccess = roleOrder[rows[0].role] >= roleOrder[requiredRole];
  return hasAccess ? rows[0].role : null;
}

/**
 * GET /api/documents - 문서 목록 (카테고리별)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { categoryId } = req.query;

    if (!categoryId) {
      return res.status(400).json({ error: 'categoryId가 필요합니다.' });
    }

    const role = await checkCategoryAccess(req.user.id, categoryId);
    if (!role) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    const [documents] = await db.execute(`
      SELECT d.*, u.name as author_name,
        (SELECT COUNT(*) FROM blocks WHERE document_id = d.id) as block_count
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.category_id = ?
      ORDER BY d.id ASC
    `, [categoryId]);

    res.json({ documents: documents.map(d => ({...formatDocument(d), blockCount: d.block_count})) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/:id - 문서 상세 (블록 포함)
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await checkDocumentAccess(req.user.id, id);
    if (!role) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    const [documentRows] = await db.execute(`
      SELECT d.*, u.name as author_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `, [id]);

    if (documentRows.length === 0) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    // 블록 목록
    const [blocks] = await db.execute(`
      SELECT * FROM blocks
      WHERE document_id = ?
      ORDER BY sort_order ASC
    `, [id]);

    res.json({
      document: {
        ...formatDocument(documentRows[0]),
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
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { categoryId, title, status = 'draft' } = req.body;

    if (!categoryId || !title) {
      return res.status(400).json({ error: 'categoryId와 title은 필수입니다.' });
    }

    const role = await checkCategoryAccess(req.user.id, categoryId, 'writer');
    if (!role) {
      return res.status(403).json({ error: '문서 생성 권한이 없습니다.' });
    }

    const [result] = await db.execute(`
      INSERT INTO documents (category_id, title, status, created_by)
      VALUES (?, ?, ?, ?)
    `, [categoryId, title, status, req.user.id]);

    const documentId = result.insertId;

    // 기본 텍스트 블록 추가
    await db.execute(`
      INSERT INTO blocks (document_id, block_type, content, sort_order)
      VALUES (?, 'text', '', 1)
    `, [documentId]);

    const [documentRows] = await db.execute(`
      SELECT d.*, u.name as author_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `, [documentId]);

    const [blocks] = await db.execute('SELECT * FROM blocks WHERE document_id = ?', [documentId]);

    res.status(201).json({
      document: {
        ...formatDocument(documentRows[0]),
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
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, status } = req.body;

    const role = await checkDocumentAccess(req.user.id, id, 'writer');
    if (!role) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    await db.execute(`
      UPDATE documents
      SET title = COALESCE(?, title),
          status = COALESCE(?, status),
          updated_at = NOW()
      WHERE id = ?
    `, [title, status, id]);

    const [documentRows] = await db.execute(`
      SELECT d.*, u.name as author_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `, [id]);

    res.json({ document: formatDocument(documentRows[0]) });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/documents/:id/blocks - 문서 블록 전체 저장
 */
router.put('/:id/blocks', authenticate, async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const { blocks, createVersion = false } = req.body;

    const role = await checkDocumentAccess(req.user.id, id, 'writer');
    if (!role) {
      connection.release();
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    // 현재 문서 정보
    const [documentRows] = await connection.execute('SELECT * FROM documents WHERE id = ?', [id]);
    if (documentRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    await connection.beginTransaction();

    try {
      // 버전 생성 (옵션)
      if (createVersion) {
        const [currentBlocks] = await connection.execute('SELECT * FROM blocks WHERE document_id = ?', [id]);
        const [versionRows] = await connection.execute(
          'SELECT COALESCE(MAX(version_number), 0) + 1 as next FROM document_versions WHERE document_id = ?',
          [id]
        );
        const versionNumber = versionRows[0].next;

        await connection.execute(
          'INSERT INTO document_versions (document_id, version_number, snapshot, created_by) VALUES (?, ?, ?, ?)',
          [id, versionNumber, JSON.stringify(currentBlocks), req.user.id]
        );
      }

      // 기존 블록 삭제
      await connection.execute('DELETE FROM blocks WHERE document_id = ?', [id]);

      // 새 블록 삽입
      for (let index = 0; index < blocks.length; index++) {
        const block = blocks[index];
        await connection.execute(
          `INSERT INTO blocks (document_id, block_type, content, file_url, file_name, file_size, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, block.blockType, block.content || '', block.fileUrl || null, block.fileName || null, block.fileSize || null, index + 1]
        );
      }

      // 문서 업데이트 시간 갱신
      await connection.execute('UPDATE documents SET updated_at = NOW() WHERE id = ?', [id]);

      await connection.commit();

      // 업데이트된 문서 반환
      const [updatedDocRows] = await db.execute(`
        SELECT d.*, u.name as author_name
        FROM documents d
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.id = ?
      `, [id]);

      const [updatedBlocks] = await db.execute('SELECT * FROM blocks WHERE document_id = ? ORDER BY sort_order', [id]);

      res.json({
        document: {
          ...formatDocument(updatedDocRows[0]),
          blocks: updatedBlocks.map(formatBlock),
        },
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    }
  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
});

/**
 * GET /api/documents/:id/versions - 문서 버전 목록
 */
router.get('/:id/versions', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await checkDocumentAccess(req.user.id, id);
    if (!role) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    const [versions] = await db.execute(`
      SELECT dv.*, u.name as created_by_name
      FROM document_versions dv
      LEFT JOIN users u ON dv.created_by = u.id
      WHERE dv.document_id = ?
      ORDER BY dv.version_number DESC
    `, [id]);

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
router.delete('/:id', authenticate, async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    const role = await checkDocumentAccess(req.user.id, id, 'editor');
    if (!role) {
      connection.release();
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    await connection.beginTransaction();

    try {
      await connection.execute('DELETE FROM blocks WHERE document_id = ?', [id]);
      await connection.execute('DELETE FROM document_versions WHERE document_id = ?', [id]);
      await connection.execute('DELETE FROM documents WHERE id = ?', [id]);

      await connection.commit();
      res.json({ message: '문서가 삭제되었습니다.' });
    } catch (err) {
      await connection.rollback();
      throw err;
    }
  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
});

export default router;
