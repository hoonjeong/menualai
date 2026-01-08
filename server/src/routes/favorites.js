import express from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 모든 라우트에 인증 필요
router.use(authenticate);

/**
 * GET /api/favorites
 * 즐겨찾기 목록 조회
 */
router.get('/', async (req, res) => {
  try {
    const [favorites] = await pool.query(
      `SELECT
        f.id,
        f.document_id as documentId,
        d.title as documentTitle,
        c.name as categoryName,
        w.name as workspaceName,
        f.created_at as createdAt
      FROM favorites f
      JOIN documents d ON f.document_id = d.id
      JOIN categories c ON d.category_id = c.id
      JOIN workspaces w ON c.workspace_id = w.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC`,
      [req.user.id]
    );

    res.json({ favorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: '즐겨찾기 목록을 불러오는데 실패했습니다.' });
  }
});

/**
 * POST /api/favorites
 * 즐겨찾기 추가
 */
router.post('/', async (req, res) => {
  try {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: '문서 ID가 필요합니다.' });
    }

    // 문서 존재 여부 확인
    const [documents] = await pool.query(
      'SELECT id FROM documents WHERE id = ?',
      [documentId]
    );

    if (documents.length === 0) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    // 이미 즐겨찾기에 있는지 확인
    const [existing] = await pool.query(
      'SELECT id FROM favorites WHERE user_id = ? AND document_id = ?',
      [req.user.id, documentId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: '이미 즐겨찾기에 추가된 문서입니다.' });
    }

    // 즐겨찾기 추가
    const [result] = await pool.query(
      'INSERT INTO favorites (user_id, document_id) VALUES (?, ?)',
      [req.user.id, documentId]
    );

    // 추가된 즐겨찾기 정보 조회
    const [favorites] = await pool.query(
      `SELECT
        f.id,
        f.document_id as documentId,
        d.title as documentTitle,
        c.name as categoryName,
        w.name as workspaceName,
        f.created_at as createdAt
      FROM favorites f
      JOIN documents d ON f.document_id = d.id
      JOIN categories c ON d.category_id = c.id
      JOIN workspaces w ON c.workspace_id = w.id
      WHERE f.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ favorite: favorites[0] });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: '즐겨찾기 추가에 실패했습니다.' });
  }
});

/**
 * DELETE /api/favorites/:documentId
 * 즐겨찾기 제거
 */
router.delete('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    const [result] = await pool.query(
      'DELETE FROM favorites WHERE user_id = ? AND document_id = ?',
      [req.user.id, documentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '즐겨찾기를 찾을 수 없습니다.' });
    }

    res.json({ message: '즐겨찾기가 제거되었습니다.' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: '즐겨찾기 제거에 실패했습니다.' });
  }
});

/**
 * GET /api/favorites/check/:documentId
 * 즐겨찾기 여부 확인
 */
router.get('/check/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    const [favorites] = await pool.query(
      'SELECT id FROM favorites WHERE user_id = ? AND document_id = ?',
      [req.user.id, documentId]
    );

    res.json({ isFavorite: favorites.length > 0 });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ error: '즐겨찾기 확인에 실패했습니다.' });
  }
});

/**
 * GET /api/favorites/count
 * 즐겨찾기 개수 조회
 */
router.get('/count', async (req, res) => {
  try {
    const [result] = await pool.query(
      'SELECT COUNT(*) as count FROM favorites WHERE user_id = ?',
      [req.user.id]
    );

    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Count favorites error:', error);
    res.status(500).json({ error: '즐겨찾기 개수 조회에 실패했습니다.' });
  }
});

export default router;
