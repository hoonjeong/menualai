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
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name)
      VALUES (?, ?, ?)
    `).run(email, hashedPassword, name);

    const userId = result.lastInsertRowid;

    // JWT 토큰 생성
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

    // 사용자 정보 조회
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      token,
      user: formatUser(user),
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
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // JWT 토큰 생성
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // 마지막 로그인 시간 업데이트
    db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);

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

export default router;
