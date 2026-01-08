import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// 워크스페이스 정보를 camelCase로 변환
function formatWorkspace(ws) {
  if (!ws) return null;
  return {
    id: ws.id,
    name: ws.name,
    description: ws.description,
    icon: ws.icon,
    ownerId: ws.owner_id,
    status: ws.status,
    myRole: ws.myRole || ws.my_role,
    categoryCount: ws.category_count || ws.categoryCount,
    memberCount: ws.member_count || ws.memberCount,
    documentCount: ws.document_count || ws.documentCount || 0,
    createdAt: ws.created_at,
    updatedAt: ws.updated_at,
  };
}

/**
 * GET /api/workspaces - 내 워크스페이스 목록
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    // 소유한 워크스페이스 + 멤버로 참여한 워크스페이스
    const [workspaces] = await db.execute(`
      SELECT DISTINCT w.*,
        CASE WHEN w.owner_id = ? THEN 'owner' ELSE wm.role END as myRole,
        (SELECT COUNT(*) FROM categories WHERE workspace_id = w.id) as category_count,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) + 1 as member_count,
        (SELECT COUNT(*) FROM documents d JOIN categories c ON d.category_id = c.id WHERE c.workspace_id = w.id) as document_count
      FROM workspaces w
      LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
      WHERE w.owner_id = ? OR wm.user_id = ?
      ORDER BY w.updated_at DESC
    `, [req.user.id, req.user.id, req.user.id, req.user.id]);

    res.json({ workspaces: workspaces.map(formatWorkspace) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workspaces/:id - 워크스페이스 상세
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [workspaceRows] = await db.execute(`
      SELECT w.*,
        CASE WHEN w.owner_id = ? THEN 'owner' ELSE wm.role END as myRole
      FROM workspaces w
      LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
      WHERE w.id = ? AND (w.owner_id = ? OR wm.user_id = ?)
    `, [req.user.id, req.user.id, id, req.user.id, req.user.id]);

    if (workspaceRows.length === 0) {
      return res.status(404).json({ error: '워크스페이스를 찾을 수 없습니다.' });
    }

    const workspace = workspaceRows[0];

    // 카테고리 목록
    const [categories] = await db.execute(`
      SELECT c.*,
        (SELECT COUNT(*) FROM documents WHERE category_id = c.id) as document_count
      FROM categories c
      WHERE c.workspace_id = ?
      ORDER BY c.sort_order ASC
    `, [id]);

    // 멤버 목록
    const [members] = await db.execute(`
      SELECT u.id, u.email, u.name, u.profile_image, wm.role, wm.joined_at
      FROM workspace_members wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = ?
      UNION
      SELECT u.id, u.email, u.name, u.profile_image, 'owner' as role, w.created_at as joined_at
      FROM workspaces w
      JOIN users u ON w.owner_id = u.id
      WHERE w.id = ?
    `, [id, id]);

    const formattedCategories = categories.map(c => ({
      id: c.id,
      workspaceId: c.workspace_id,
      name: c.name,
      description: c.description,
      sortOrder: c.sort_order,
      documentCount: c.document_count,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    const formattedMembers = members.map(m => ({
      id: m.id,
      email: m.email,
      name: m.name,
      profileImage: m.profile_image,
      role: m.role,
      joinedAt: m.joined_at,
    }));

    res.json({
      workspace: {
        ...formatWorkspace(workspace),
        categories: formattedCategories,
        members: formattedMembers,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workspaces - 워크스페이스 생성
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, description, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: '워크스페이스 이름은 필수입니다.' });
    }

    const [result] = await db.execute(`
      INSERT INTO workspaces (name, description, icon, owner_id)
      VALUES (?, ?, ?, ?)
    `, [name, description || '', icon || '📁', req.user.id]);

    const [workspaceRows] = await db.execute('SELECT * FROM workspaces WHERE id = ?', [result.insertId]);

    res.status(201).json({ workspace: formatWorkspace(workspaceRows[0]) });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/workspaces/:id - 워크스페이스 수정
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon } = req.body;

    // 권한 확인 (소유자 또는 admin만)
    const [workspaceRows] = await db.execute(`
      SELECT w.owner_id, wm.role
      FROM workspaces w
      LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
      WHERE w.id = ?
    `, [req.user.id, id]);

    if (workspaceRows.length === 0) {
      return res.status(404).json({ error: '워크스페이스를 찾을 수 없습니다.' });
    }

    const workspace = workspaceRows[0];

    if (workspace.owner_id !== req.user.id && workspace.role !== 'admin') {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    await db.execute(`
      UPDATE workspaces
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          icon = COALESCE(?, icon),
          updated_at = NOW()
      WHERE id = ?
    `, [name, description, icon, id]);

    const [updated] = await db.execute('SELECT * FROM workspaces WHERE id = ?', [id]);
    res.json({ workspace: formatWorkspace(updated[0]) });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/workspaces/:id - 워크스페이스 삭제
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    // 소유자만 삭제 가능
    const [workspaceRows] = await connection.execute('SELECT owner_id FROM workspaces WHERE id = ?', [id]);

    if (workspaceRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: '워크스페이스를 찾을 수 없습니다.' });
    }

    if (workspaceRows[0].owner_id !== req.user.id) {
      connection.release();
      return res.status(403).json({ error: '소유자만 삭제할 수 있습니다.' });
    }

    // 트랜잭션으로 관련 데이터 모두 삭제
    await connection.beginTransaction();

    try {
      // 블록 삭제
      await connection.execute(`
        DELETE FROM blocks WHERE document_id IN (
          SELECT id FROM documents WHERE category_id IN (
            SELECT id FROM categories WHERE workspace_id = ?
          )
        )
      `, [id]);

      // 문서 버전 삭제
      await connection.execute(`
        DELETE FROM document_versions WHERE document_id IN (
          SELECT id FROM documents WHERE category_id IN (
            SELECT id FROM categories WHERE workspace_id = ?
          )
        )
      `, [id]);

      // 문서 삭제
      await connection.execute(`
        DELETE FROM documents WHERE category_id IN (
          SELECT id FROM categories WHERE workspace_id = ?
        )
      `, [id]);

      // 카테고리 삭제
      await connection.execute('DELETE FROM categories WHERE workspace_id = ?', [id]);

      // 멤버 삭제
      await connection.execute('DELETE FROM workspace_members WHERE workspace_id = ?', [id]);

      // 초대 삭제
      await connection.execute('DELETE FROM invitations WHERE workspace_id = ?', [id]);

      // 워크스페이스 삭제
      await connection.execute('DELETE FROM workspaces WHERE id = ?', [id]);

      await connection.commit();
      res.json({ message: '워크스페이스가 삭제되었습니다.' });
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
 * POST /api/workspaces/:id/members - 멤버 추가 (초대)
 */
router.post('/:id/members', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, role = 'viewer' } = req.body;

    // 권한 확인
    const [workspaceRows] = await db.execute(`
      SELECT w.owner_id, wm.role
      FROM workspaces w
      LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
      WHERE w.id = ?
    `, [req.user.id, id]);

    if (workspaceRows.length === 0) {
      return res.status(404).json({ error: '워크스페이스를 찾을 수 없습니다.' });
    }

    const workspace = workspaceRows[0];

    if (workspace.owner_id !== req.user.id && workspace.role !== 'admin') {
      return res.status(403).json({ error: '멤버를 추가할 권한이 없습니다.' });
    }

    // 사용자 찾기
    const [userRows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: '해당 이메일의 사용자를 찾을 수 없습니다.' });
    }

    const user = userRows[0];

    // 이미 멤버인지 확인
    const [existingRows] = await db.execute(
      'SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [id, user.id]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({ error: '이미 워크스페이스 멤버입니다.' });
    }

    // 소유자인지 확인
    if (workspace.owner_id === user.id) {
      return res.status(400).json({ error: '소유자는 멤버로 추가할 수 없습니다.' });
    }

    // 멤버 추가
    await db.execute(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)',
      [id, user.id, role]
    );

    res.status(201).json({ message: '멤버가 추가되었습니다.' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/workspaces/:id/members/:userId - 멤버 제거
 */
router.delete('/:id/members/:userId', authenticate, async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    // 권한 확인
    const [workspaceRows] = await db.execute(`
      SELECT w.owner_id, wm.role
      FROM workspaces w
      LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
      WHERE w.id = ?
    `, [req.user.id, id]);

    if (workspaceRows.length === 0) {
      return res.status(404).json({ error: '워크스페이스를 찾을 수 없습니다.' });
    }

    const workspace = workspaceRows[0];

    // 소유자 또는 admin만 가능, 또는 본인 탈퇴
    const isOwnerOrAdmin = workspace.owner_id === req.user.id || workspace.role === 'admin';
    const isSelf = req.user.id === parseInt(userId);

    if (!isOwnerOrAdmin && !isSelf) {
      return res.status(403).json({ error: '멤버를 제거할 권한이 없습니다.' });
    }

    await db.execute(
      'DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [id, userId]
    );

    res.json({ message: '멤버가 제거되었습니다.' });
  } catch (error) {
    next(error);
  }
});

export default router;
