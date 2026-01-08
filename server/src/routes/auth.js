import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authenticate, JWT_SECRET } from '../middleware/auth.js';

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
    role: 'user', // 기본 역할
    createdAt: user.created_at,
  };
}

/**
 * POST /api/auth/register - 회원가입
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // 유효성 검사
    if (!email || !password || !name) {
      return res.status(400).json({ error: '이메일, 비밀번호, 이름은 필수입니다.' });
    }

    // 이메일 중복 확인
    const [existingUsers] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const [result] = await db.execute(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name]
    );

    const userId = result.insertId;

    // JWT 토큰 생성
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

    // 사용자 정보 조회
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      token,
      user: formatUser(users[0]),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login - 로그인
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }

    // 사용자 조회
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const user = users[0];

    // 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // JWT 토큰 생성
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // 마지막 로그인 시간 업데이트
    await db.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    res.json({
      message: '로그인 성공',
      token,
      user: formatUser(user),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me - 현재 로그인된 사용자 정보
 */
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

/**
 * POST /api/auth/logout - 로그아웃 (클라이언트에서 토큰 삭제)
 */
router.post('/logout', authenticate, (req, res) => {
  // JWT는 stateless이므로 서버에서 특별히 할 것은 없음
  // 클라이언트에서 토큰을 삭제하면 됨
  res.json({ message: '로그아웃 되었습니다.' });
});

/**
 * PUT /api/auth/profile - 프로필 업데이트
 */
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, organization } = req.body;
    const userId = req.user.id;

    // 이름 유효성 검사
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: '이름은 필수입니다.' });
    }

    // 업데이트
    await db.execute(
      'UPDATE users SET name = COALESCE(?, name), organization = COALESCE(?, organization), updated_at = NOW() WHERE id = ?',
      [name?.trim(), organization?.trim() || null, userId]
    );

    // 업데이트된 사용자 정보 조회
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);

    res.json({
      message: '프로필이 업데이트되었습니다.',
      user: formatUser(users[0]),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/password - 비밀번호 변경
 */
router.put('/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // 유효성 검사
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
    }

    // 현재 사용자 조회
    const [users] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 현재 비밀번호 검증
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
    }

    // 새 비밀번호 해시
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await db.execute('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [
      hashedPassword,
      userId,
    ]);

    res.json({ message: '비밀번호가 변경되었습니다.' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/auth/account - 계정 삭제
 */
router.delete('/account', authenticate, async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    const { password } = req.body;
    const userId = req.user.id;

    // 비밀번호 확인
    if (!password) {
      connection.release();
      return res.status(400).json({ error: '비밀번호를 입력해주세요.' });
    }

    // 현재 사용자 조회
    const [users] = await connection.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      connection.release();
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, users[0].password_hash);
    if (!isValidPassword) {
      connection.release();
      return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
    }

    // 트랜잭션으로 관련 데이터 모두 삭제
    await connection.beginTransaction();

    try {
      // 소유한 워크스페이스 목록 조회
      const [ownedWorkspaces] = await connection.execute(
        'SELECT id FROM workspaces WHERE owner_id = ?',
        [userId]
      );

      // 각 소유 워크스페이스의 관련 데이터 삭제
      for (const ws of ownedWorkspaces) {
        // 블록 삭제
        await connection.execute(`
          DELETE FROM blocks WHERE document_id IN (
            SELECT id FROM documents WHERE category_id IN (
              SELECT id FROM categories WHERE workspace_id = ?
            )
          )
        `, [ws.id]);

        // 문서 버전 삭제
        await connection.execute(`
          DELETE FROM document_versions WHERE document_id IN (
            SELECT id FROM documents WHERE category_id IN (
              SELECT id FROM categories WHERE workspace_id = ?
            )
          )
        `, [ws.id]);

        // 즐겨찾기 삭제
        await connection.execute(`
          DELETE FROM favorites WHERE document_id IN (
            SELECT id FROM documents WHERE category_id IN (
              SELECT id FROM categories WHERE workspace_id = ?
            )
          )
        `, [ws.id]);

        // 문서 삭제
        await connection.execute(`
          DELETE FROM documents WHERE category_id IN (
            SELECT id FROM categories WHERE workspace_id = ?
          )
        `, [ws.id]);

        // 카테고리 삭제
        await connection.execute('DELETE FROM categories WHERE workspace_id = ?', [ws.id]);

        // 멤버 삭제
        await connection.execute('DELETE FROM workspace_members WHERE workspace_id = ?', [ws.id]);

        // 초대 삭제
        await connection.execute('DELETE FROM invitations WHERE workspace_id = ?', [ws.id]);

        // 워크스페이스 삭제
        await connection.execute('DELETE FROM workspaces WHERE id = ?', [ws.id]);
      }

      // 다른 워크스페이스에서 멤버십 삭제
      await connection.execute('DELETE FROM workspace_members WHERE user_id = ?', [userId]);

      // 사용자의 즐겨찾기 삭제
      await connection.execute('DELETE FROM favorites WHERE user_id = ?', [userId]);

      // AI 채팅 기록 삭제
      await connection.execute('DELETE FROM ai_chat_messages WHERE user_id = ?', [userId]);

      // 사용자 삭제
      await connection.execute('DELETE FROM users WHERE id = ?', [userId]);

      await connection.commit();
      res.json({ message: '계정이 삭제되었습니다.' });
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
