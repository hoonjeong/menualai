/**
 * Manualic Database Initialization Script (MariaDB)
 *
 * 사용법: node database/init.js
 *
 * 이 스크립트는:
 * 1. MariaDB 데이터베이스 생성
 * 2. 스키마 적용
 * 3. 샘플 데이터 삽입
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터베이스 연결 설정
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Flqhs0315!',
    multipleStatements: true,
};

const DB_NAME = process.env.DB_NAME || 'manualic';
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// 간단한 비밀번호 해시 함수 (테스트용)
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function initDatabase() {
    let connection;

    try {
        console.log('🚀 Manualic 데이터베이스 초기화 시작...\n');

        // 데이터베이스 연결 (DB 선택 없이)
        connection = await mysql.createConnection(DB_CONFIG);

        // 기존 데이터베이스 삭제 후 재생성
        console.log('📁 데이터베이스 생성 중...');
        await connection.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
        await connection.query(`CREATE DATABASE ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.query(`USE ${DB_NAME}`);
        console.log(`✅ 데이터베이스 '${DB_NAME}' 생성 완료`);

        // 스키마 적용 (CREATE DATABASE, USE 문 제외하고 테이블만)
        console.log('📋 스키마 적용 중...');
        const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');

        // CREATE DATABASE와 USE 문 제거 (이미 위에서 처리함)
        const schemaWithoutDb = schemaContent
            .replace(/CREATE DATABASE[^;]+;/gi, '')
            .replace(/USE\s+\w+\s*;/gi, '');

        await connection.query(schemaWithoutDb);
        console.log('✅ 스키마 적용 완료\n');

        // =============================================
        // 샘플 데이터 삽입
        // =============================================
        console.log('📝 샘플 데이터 삽입 중...\n');

        // 1. 사용자 생성
        const users = [
            { email: 'admin@manualic.com', password: 'admin123', name: '관리자', org: 'Manualic' },
            { email: 'user1@example.com', password: 'user123', name: '김철수', org: '테스트회사' },
            { email: 'user2@example.com', password: 'user123', name: '이영희', org: '테스트회사' },
        ];

        const userIds = [];
        for (const user of users) {
            const [result] = await connection.query(
                'INSERT INTO users (email, password_hash, name, organization) VALUES (?, ?, ?, ?)',
                [user.email, hashPassword(user.password), user.name, user.org]
            );
            userIds.push(result.insertId);
            console.log(`  👤 사용자 생성: ${user.name} (${user.email})`);
        }

        // 2. 워크스페이스(사업) 생성
        const workspaces = [
            { name: '카페 운영 매뉴얼', desc: '카페 창업부터 운영까지 전체 가이드', icon: '☕', ownerId: userIds[0] },
            { name: '스타트업 온보딩', desc: '신규 입사자를 위한 온보딩 가이드', icon: '🚀', ownerId: userIds[1] },
        ];

        const workspaceIds = [];
        for (const ws of workspaces) {
            const [result] = await connection.query(
                'INSERT INTO workspaces (name, description, icon, owner_id, status) VALUES (?, ?, ?, ?, ?)',
                [ws.name, ws.desc, ws.icon, ws.ownerId, 'active']
            );
            workspaceIds.push(result.insertId);
            console.log(`  🏢 워크스페이스 생성: ${ws.name}`);
        }

        // 3. 워크스페이스 멤버 추가
        await connection.query(
            'INSERT INTO workspace_members (workspace_id, user_id, role, invited_by) VALUES (?, ?, ?, ?)',
            [workspaceIds[0], userIds[0], 'admin', null]
        );
        await connection.query(
            'INSERT INTO workspace_members (workspace_id, user_id, role, invited_by) VALUES (?, ?, ?, ?)',
            [workspaceIds[0], userIds[1], 'editor', userIds[0]]
        );
        await connection.query(
            'INSERT INTO workspace_members (workspace_id, user_id, role, invited_by) VALUES (?, ?, ?, ?)',
            [workspaceIds[0], userIds[2], 'viewer', userIds[0]]
        );
        console.log('  👥 워크스페이스 멤버 추가됨');

        // 4. 카테고리 생성
        const categories = [
            { wsId: workspaceIds[0], name: '매장 준비', desc: '오픈 전 준비사항', order: 1 },
            { wsId: workspaceIds[0], name: '음료 제조', desc: '음료 레시피 및 제조법', order: 2 },
            { wsId: workspaceIds[0], name: '고객 응대', desc: '고객 서비스 가이드', order: 3 },
            { wsId: workspaceIds[0], name: '마감 정리', desc: '영업 종료 후 정리', order: 4 },
        ];

        const categoryIds = [];
        for (const cat of categories) {
            const [result] = await connection.query(
                'INSERT INTO categories (workspace_id, name, description, sort_order) VALUES (?, ?, ?, ?)',
                [cat.wsId, cat.name, cat.desc, cat.order]
            );
            categoryIds.push(result.insertId);
            console.log(`  📁 카테고리 생성: ${cat.name}`);
        }

        // 5. 문서(매뉴얼) 생성
        const documents = [
            { catId: categoryIds[0], title: '오픈 체크리스트', status: 'published', visibility: 'private', createdBy: userIds[0] },
            { catId: categoryIds[0], title: '청소 가이드', status: 'published', visibility: 'private', createdBy: userIds[0] },
            { catId: categoryIds[1], title: '아메리카노 제조법', status: 'published', visibility: 'public_free', createdBy: userIds[1] },
            { catId: categoryIds[1], title: '라떼 제조법', status: 'draft', visibility: 'private', createdBy: userIds[1] },
            { catId: categoryIds[2], title: '주문 접수 가이드', status: 'published', visibility: 'private', createdBy: userIds[0] },
        ];

        const documentIds = [];
        for (const doc of documents) {
            const [result] = await connection.query(
                'INSERT INTO documents (category_id, title, status, visibility, created_by) VALUES (?, ?, ?, ?, ?)',
                [doc.catId, doc.title, doc.status, doc.visibility, doc.createdBy]
            );
            documentIds.push(result.insertId);
            console.log(`  📄 문서 생성: ${doc.title}`);
        }

        // 6. 블록 생성
        const openChecklistBlocks = [
            { type: 'text', content: '# 매장 오픈 체크리스트\n\n매일 아침 오픈 전 확인해야 할 사항들입니다.', order: 1 },
            { type: 'text', content: '## 1. 전기 및 설비 점검\n\n1. 메인 전원 ON\n2. 에어컨/난방 가동\n3. 조명 점검', order: 2 },
            { type: 'text', content: '## 2. 커피 머신 준비\n\n1. 머신 전원 ON (예열 15분)\n2. 물통 확인\n3. 원두 충전', order: 3 },
            { type: 'text', content: '## 3. 재료 점검\n\n- 우유 재고 확인\n- 시럽류 확인\n- 컵/빨대 확인', order: 4 },
        ];

        for (const block of openChecklistBlocks) {
            await connection.query(
                'INSERT INTO blocks (document_id, block_type, content, sort_order) VALUES (?, ?, ?, ?)',
                [documentIds[0], block.type, block.content, block.order]
            );
        }
        console.log('  📝 블록 생성: 오픈 체크리스트 (4개 블록)');

        const americanoBlocks = [
            { type: 'text', content: '# 아메리카노 제조법\n\n기본 아메리카노 제조 가이드입니다.', order: 1 },
            { type: 'text', content: '## 재료\n\n- 에스프레소 샷: 2샷 (약 30ml)\n- 정수물: 150ml (아이스의 경우 얼음 + 물 120ml)', order: 2 },
            { type: 'text', content: '## HOT 아메리카노\n\n1. 컵에 뜨거운 물 150ml를 먼저 담습니다\n2. 에스프레소 2샷을 추출하여 위에 부어줍니다\n3. 가볍게 저어 섞어줍니다', order: 3 },
            { type: 'text', content: '## ICE 아메리카노\n\n1. 컵에 얼음을 가득 채웁니다\n2. 차가운 물 120ml를 넣습니다\n3. 에스프레소 2샷을 추출하여 위에 부어줍니다', order: 4 },
        ];

        for (const block of americanoBlocks) {
            await connection.query(
                'INSERT INTO blocks (document_id, block_type, content, sort_order) VALUES (?, ?, ?, ?)',
                [documentIds[2], block.type, block.content, block.order]
            );
        }
        console.log('  📝 블록 생성: 아메리카노 제조법 (4개 블록)');

        // 7. 버전 생성
        await connection.query(
            'INSERT INTO document_versions (document_id, version_number, snapshot, change_summary, created_by) VALUES (?, ?, ?, ?, ?)',
            [documentIds[0], 1, JSON.stringify(openChecklistBlocks), '최초 작성', userIds[0]]
        );
        await connection.query(
            'INSERT INTO document_versions (document_id, version_number, snapshot, change_summary, created_by) VALUES (?, ?, ?, ?, ?)',
            [documentIds[2], 1, JSON.stringify(americanoBlocks), '최초 작성', userIds[1]]
        );
        console.log('  📜 버전 기록 생성됨');

        // 8. 활동 로그 생성
        await connection.query(
            'INSERT INTO activity_logs (user_id, workspace_id, action_type, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)',
            [userIds[0], workspaceIds[0], 'create', 'workspace', workspaceIds[0], JSON.stringify({ name: '카페 운영 매뉴얼' })]
        );
        await connection.query(
            'INSERT INTO activity_logs (user_id, workspace_id, action_type, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)',
            [userIds[0], workspaceIds[0], 'create', 'document', documentIds[0], JSON.stringify({ title: '오픈 체크리스트' })]
        );
        await connection.query(
            'INSERT INTO activity_logs (user_id, workspace_id, action_type, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)',
            [userIds[1], workspaceIds[0], 'create', 'document', documentIds[2], JSON.stringify({ title: '아메리카노 제조법' })]
        );
        console.log('  📊 활동 로그 생성됨');

        // 9. 즐겨찾기 추가
        await connection.query(
            'INSERT INTO favorites (user_id, document_id) VALUES (?, ?)',
            [userIds[0], documentIds[0]]
        );
        await connection.query(
            'INSERT INTO favorites (user_id, document_id) VALUES (?, ?)',
            [userIds[1], documentIds[2]]
        );
        console.log('  ⭐ 즐겨찾기 추가됨');

        console.log('\n✅ 데이터베이스 초기화 완료!');
        console.log('\n📊 생성된 데이터 요약:');
        console.log(`   - 사용자: ${users.length}명`);
        console.log(`   - 워크스페이스: ${workspaces.length}개`);
        console.log(`   - 카테고리: ${categories.length}개`);
        console.log(`   - 문서: ${documents.length}개`);
        console.log(`   - 블록: ${openChecklistBlocks.length + americanoBlocks.length}개`);

        console.log('\n📁 데이터베이스: MariaDB - ' + DB_NAME);
        console.log('\n🔐 테스트 계정:');
        console.log('   - admin@manualic.com / admin123 (관리자)');
        console.log('   - user1@example.com / user123 (편집자)');
        console.log('   - user2@example.com / user123 (뷰어)');

    } catch (error) {
        console.error('❌ 데이터베이스 초기화 실패:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

initDatabase().catch(console.error);
