import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// 사용자 정보를 camelCase로 변환
function formatUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    profileImage: user.profile_image,
    organization: user.organization,
    role: 'user',
    createdAt: user.created_at,
  };
}

/**
 * GET /api/users/:id - 사용자 정보 조회
 */
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;

    const user = db.prepare(`
      SELECT id, email, name, profile_image, organization, created_at
      FROM users WHERE id = ?
    `).get(id);

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ user: formatUser(user) });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/:id - 사용자 정보 수정
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 본인만 수정 가능
    if (req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    const { name, profileImage, organization } = req.body;

    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          profile_image = COALESCE(?, profile_image),
          organization = COALESCE(?, organization),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, profileImage, organization, id);

    const user = db.prepare(`
      SELECT id, email, name, profile_image, organization, created_at
      FROM users WHERE id = ?
    `).get(id);

    res.json({ user: formatUser(user) });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/:id/password - 비밀번호 변경
 */
router.put('/:id/password', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 본인만 변경 가능
    if (req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: '변경 권한이 없습니다.' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
    }

    // 현재 비밀번호 확인
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(id);
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isValid) {
      return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
    }

    // 새 비밀번호 해시 및 저장
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(hashedPassword, id);

    res.json({ message: '비밀번호가 변경되었습니다.' });
  } catch (error) {
    next(error);
  }
});

export default router;
