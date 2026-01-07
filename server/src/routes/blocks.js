import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

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

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'));
    }
  },
});

/**
 * 문서 접근 권한 확인
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
 * GET /api/blocks - 문서의 블록 목록
 */
router.get('/', authenticate, (req, res, next) => {
  try {
    const { documentId } = req.query;

    if (!documentId) {
      return res.status(400).json({ error: 'documentId가 필요합니다.' });
    }

    const role = checkDocumentAccess(req.user.id, documentId);
    if (!role) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    const blocks = db.prepare(`
      SELECT * FROM blocks
      WHERE document_id = ?
      ORDER BY sort_order ASC
    `).all(documentId);

    res.json({ blocks: blocks.map(formatBlock) });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/blocks - 블록 생성
 */
router.post('/', authenticate, (req, res, next) => {
  try {
    const { documentId, blockType, content, fileUrl, fileName, fileSize, afterBlockId } = req.body;

    if (!documentId || !blockType) {
      return res.status(400).json({ error: 'documentId와 blockType은 필수입니다.' });
    }

    const role = checkDocumentAccess(req.user.id, documentId, 'writer');
    if (!role) {
      return res.status(403).json({ error: '블록 생성 권한이 없습니다.' });
    }

    let sortOrder = 1;

    if (afterBlockId) {
      // 특정 블록 뒤에 삽입
      const afterBlock = db.prepare('SELECT sort_order FROM blocks WHERE id = ?').get(afterBlockId);
      if (afterBlock) {
        sortOrder = afterBlock.sort_order + 1;
        // 이후 블록들의 순서 증가
        db.prepare(`
          UPDATE blocks SET sort_order = sort_order + 1
          WHERE document_id = ? AND sort_order >= ?
        `).run(documentId, sortOrder);
      }
    } else {
      // 맨 마지막에 추가
      const maxOrder = db.prepare(`
        SELECT MAX(sort_order) as maxOrder FROM blocks WHERE document_id = ?
      `).get(documentId);
      sortOrder = (maxOrder?.maxOrder || 0) + 1;
    }

    const result = db.prepare(`
      INSERT INTO blocks (document_id, block_type, content, file_url, file_name, file_size, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(documentId, blockType, content || '', fileUrl || null, fileName || null, fileSize || null, sortOrder);

    // 문서 업데이트 시간 갱신
    db.prepare('UPDATE documents SET updated_at = datetime("now") WHERE id = ?').run(documentId);

    const block = db.prepare('SELECT * FROM blocks WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ block: formatBlock(block) });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/blocks/:id - 블록 수정
 */
router.put('/:id', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, fileUrl, fileName, fileSize } = req.body;

    const block = db.prepare('SELECT document_id FROM blocks WHERE id = ?').get(id);
    if (!block) {
      return res.status(404).json({ error: '블록을 찾을 수 없습니다.' });
    }

    const role = checkDocumentAccess(req.user.id, block.document_id, 'writer');
    if (!role) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    db.prepare(`
      UPDATE blocks
      SET content = COALESCE(?, content),
          file_url = COALESCE(?, file_url),
          file_name = COALESCE(?, file_name),
          file_size = COALESCE(?, file_size),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(content, fileUrl, fileName, fileSize, id);

    // 문서 업데이트 시간 갱신
    db.prepare('UPDATE documents SET updated_at = datetime("now") WHERE id = ?').run(block.document_id);

    const updated = db.prepare('SELECT * FROM blocks WHERE id = ?').get(id);

    res.json({ block: formatBlock(updated) });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/blocks/:id - 블록 삭제
 */
router.delete('/:id', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;

    const block = db.prepare('SELECT document_id, sort_order FROM blocks WHERE id = ?').get(id);
    if (!block) {
      return res.status(404).json({ error: '블록을 찾을 수 없습니다.' });
    }

    const role = checkDocumentAccess(req.user.id, block.document_id, 'writer');
    if (!role) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    const deleteBlock = db.transaction(() => {
      db.prepare('DELETE FROM blocks WHERE id = ?').run(id);

      // 이후 블록들의 순서 감소
      db.prepare(`
        UPDATE blocks SET sort_order = sort_order - 1
        WHERE document_id = ? AND sort_order > ?
      `).run(block.document_id, block.sort_order);

      // 문서 업데이트 시간 갱신
      db.prepare('UPDATE documents SET updated_at = datetime("now") WHERE id = ?').run(block.document_id);
    });

    deleteBlock();

    res.json({ message: '블록이 삭제되었습니다.' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/blocks/upload - 파일 업로드
 */
router.post('/upload', authenticate, upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 없습니다.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const isImage = req.file.mimetype.startsWith('image/');

    res.json({
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      isImage,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
