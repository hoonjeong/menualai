-- Manualic Database Schema (MariaDB)
-- 비즈니스 매뉴얼 통합 관리 플랫폼

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS manualic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE manualic;

-- =============================================
-- 1. 사용자 (Users)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    profile_image VARCHAR(500),
    organization VARCHAR(200),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at DATETIME,
    is_active TINYINT DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2. 사업 (Workspaces)
-- =============================================
CREATE TABLE IF NOT EXISTS workspaces (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    owner_id INT NOT NULL,
    status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 3. 카테고리 (Categories/Sections)
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 4. 매뉴얼/문서 (Documents)
-- =============================================
CREATE TABLE IF NOT EXISTS documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    title VARCHAR(300) NOT NULL,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    visibility ENUM('private', 'public_free', 'public_paid') DEFAULT 'private',
    price_points INT DEFAULT 0,
    share_link VARCHAR(255) UNIQUE,
    share_password VARCHAR(255),
    share_expires_at DATETIME,
    allow_download TINYINT DEFAULT 1,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 5. 블록 (Blocks) - 문서 내용 구성 요소
-- =============================================
CREATE TABLE IF NOT EXISTS blocks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT NOT NULL,
    block_type ENUM('text', 'image', 'file') NOT NULL,
    content LONGTEXT,
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size INT,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 6. 문서 버전 (Document Versions)
-- =============================================
CREATE TABLE IF NOT EXISTS document_versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT NOT NULL,
    version_number INT NOT NULL,
    snapshot LONGTEXT NOT NULL,
    change_summary TEXT,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 7. 블록 편집 이력 (Block Edit History)
-- =============================================
CREATE TABLE IF NOT EXISTS block_edit_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    block_id INT NOT NULL,
    previous_content LONGTEXT,
    new_content LONGTEXT,
    edited_by INT NOT NULL,
    edited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
    FOREIGN KEY (edited_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 8. 워크스페이스 멤버 (Workspace Members)
-- =============================================
CREATE TABLE IF NOT EXISTS workspace_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('viewer', 'writer', 'editor', 'admin') NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    invited_by INT,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_workspace_user (workspace_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 9. 초대 (Invitations)
-- =============================================
CREATE TABLE IF NOT EXISTS invitations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('viewer', 'writer', 'editor', 'admin') NOT NULL,
    invite_token VARCHAR(255) UNIQUE NOT NULL,
    invite_link VARCHAR(500),
    message TEXT,
    expires_at DATETIME NOT NULL,
    status ENUM('pending', 'accepted', 'expired', 'cancelled') DEFAULT 'pending',
    invited_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 10. 즐겨찾기 (Favorites)
-- =============================================
CREATE TABLE IF NOT EXISTS favorites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    document_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_document (user_id, document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 11. 활동 로그 (Activity Logs)
-- =============================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    workspace_id INT,
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id INT NOT NULL,
    details JSON,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 12. 카테고리별 권한 (Category Permissions)
-- =============================================
CREATE TABLE IF NOT EXISTS category_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    user_id INT NOT NULL,
    permission ENUM('view', 'write', 'edit', 'admin') NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_category_user (category_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 13. 문서별 권한 (Document Permissions)
-- =============================================
CREATE TABLE IF NOT EXISTS document_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT NOT NULL,
    user_id INT NOT NULL,
    permission ENUM('view', 'write', 'edit', 'admin') NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_document_user (document_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 14. AI 대화 기록 (AI Chat History)
-- =============================================
CREATE TABLE IF NOT EXISTS ai_chat_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    document_id INT,
    role ENUM('user', 'assistant') NOT NULL,
    message LONGTEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 인덱스 생성 (검색 성능 최적화)
-- =============================================

-- 사용자 검색
CREATE INDEX idx_users_email ON users(email);

-- 워크스페이스 검색
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_status ON workspaces(status);

-- 카테고리 검색
CREATE INDEX idx_categories_workspace ON categories(workspace_id);
CREATE INDEX idx_categories_sort ON categories(workspace_id, sort_order);

-- 문서 검색
CREATE INDEX idx_documents_category ON documents(category_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_visibility ON documents(visibility);
CREATE INDEX idx_documents_title ON documents(title);

-- 블록 검색
CREATE INDEX idx_blocks_document ON blocks(document_id);
CREATE INDEX idx_blocks_sort ON blocks(document_id, sort_order);

-- 버전 검색
CREATE INDEX idx_versions_document ON document_versions(document_id);

-- 멤버 검색
CREATE INDEX idx_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_members_user ON workspace_members(user_id);

-- 활동 로그 검색
CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_workspace ON activity_logs(workspace_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at);

-- 전문 검색을 위한 FULLTEXT 인덱스
ALTER TABLE documents ADD FULLTEXT INDEX ft_documents_title (title);
ALTER TABLE blocks ADD FULLTEXT INDEX ft_blocks_content (content);
