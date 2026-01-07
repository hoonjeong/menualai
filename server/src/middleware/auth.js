import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'manualic-secret-key-change-in-production';

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
 * JWT 토큰 검증 미들웨어
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // 사용자 정보 조회
    const user = db.prepare(`
      SELECT id, email, name, profile_image, organization, created_at
      FROM users
      WHERE id = ?
    `).get(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    req.user = formatUser(user);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '토큰이 만료되었습니다.' });
    }
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
}

/**
 * 선택적 인증 (토큰이 있으면 검증, 없어도 통과)
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare(`
      SELECT id, email, name, profile_image, organization, created_at
      FROM users
      WHERE id = ?
    `).get(decoded.userId);

    if (user) {
      req.user = formatUser(user);
    }
  } catch (error) {
    // 토큰이 유효하지 않아도 통과
  }

  next();
}

export { JWT_SECRET };
