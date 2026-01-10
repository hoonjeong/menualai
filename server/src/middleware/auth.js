import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'manualic-secret-key-change-in-production';

// 토큰 유효기간 설정
export const ACCESS_TOKEN_EXPIRES = '15m';
export const REFRESH_TOKEN_EXPIRES = '7d';

// 기본 쿠키 설정 (세션 쿠키 - 브라우저 닫으면 삭제)
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
};

/**
 * 쿠키 옵션 생성 (로그인 유지 여부에 따라)
 * @param {boolean} rememberMe - 로그인 유지 여부
 */
export function getCookieOptions(rememberMe = false) {
  if (rememberMe) {
    return {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일 (밀리초)
    };
  }
  // rememberMe가 false면 세션 쿠키 (maxAge 없음)
  return COOKIE_OPTIONS;
}

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
 * Access Token 생성 (15분 만료)
 */
export function generateAccessToken(userId) {
  return jwt.sign({ userId, type: 'access' }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  });
}

/**
 * Refresh Token 생성 (7일 만료)
 */
export function generateRefreshToken(userId) {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES,
  });
}

/**
 * Refresh Token 검증
 */
export function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

/**
 * JWT 토큰 검증 미들웨어
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Access Token 타입 확인 (type이 없는 기존 토큰도 허용)
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }

    // 사용자 정보 조회
    const [rows] = await db.execute(
      `SELECT id, email, name, profile_image, organization, created_at
       FROM users
       WHERE id = ?`,
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    req.user = formatUser(rows[0]);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: '토큰이 만료되었습니다.',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
}

/**
 * 선택적 인증 (토큰이 있으면 검증, 없어도 통과)
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Access Token 타입 확인 (type이 없는 기존 토큰도 허용)
    if (decoded.type && decoded.type !== 'access') {
      return next();
    }

    const [rows] = await db.execute(
      `SELECT id, email, name, profile_image, organization, created_at
       FROM users
       WHERE id = ?`,
      [decoded.userId]
    );

    if (rows.length > 0) {
      req.user = formatUser(rows[0]);
    }
  } catch (error) {
    // 토큰이 유효하지 않아도 통과
  }

  next();
}

export { JWT_SECRET, formatUser };
