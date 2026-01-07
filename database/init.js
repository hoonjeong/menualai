/**
 * Manualic Database Initialization Script
 *
 * 사용법: node database/init.js
 *
 * 이 스크립트는:
 * 1. SQLite 데이터베이스 파일 생성
 * 2. 스키마 적용
 * 3. 샘플 데이터 삽입
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 데이터베이스 파일 경로
const DB_PATH = path.join(__dirname, 'manualic.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// 간단한 비밀번호 해시 함수 (테스트용)
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// 랜덤 토큰 생성
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

console.log('🚀 Manualic 데이터베이스 초기화 시작...\n');

// 기존 DB 파일이 있으면 삭제
if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('📁 기존 데이터베이스 파일 삭제됨');
}

// 데이터베이스 생성
const db = new Database(DB_PATH);
console.log('📁 새 데이터베이스 파일 생성됨: manualic.db');

// 스키마 적용
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);
console.log('✅ 스키마 적용 완료\n');

// =============================================
// 샘플 데이터 삽입
// =============================================

console.log('📝 샘플 데이터 삽입 중...\n');

// 1. 사용자 생성
const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, name, organization)
    VALUES (?, ?, ?, ?)
`);

const users = [
    { email: 'admin@manualic.com', password: 'admin123', name: '관리자', org: 'Manualic' },
    { email: 'user1@example.com', password: 'user123', name: '김철수', org: '테스트회사' },
    { email: 'user2@example.com', password: 'user123', name: '이영희', org: '테스트회사' },
];

const userIds = [];
for (const user of users) {
    const result = insertUser.run(user.email, hashPassword(user.password), user.name, user.org);
    userIds.push(result.lastInsertRowid);
    console.log(`  👤 사용자 생성: ${user.name} (${user.email})`);
}

// 2. 워크스페이스(사업) 생성
const insertWorkspace = db.prepare(`
    INSERT INTO workspaces (name, description, icon, owner_id, status)
    VALUES (?, ?, ?, ?, ?)
`);

const workspaces = [
    { name: '카페 운영 매뉴얼', desc: '카페 창업부터 운영까지 전체 가이드', icon: '☕', ownerId: userIds[0] },
    { name: '스타트업 온보딩', desc: '신규 입사자를 위한 온보딩 가이드', icon: '🚀', ownerId: userIds[1] },
];

const workspaceIds = [];
for (const ws of workspaces) {
    const result = insertWorkspace.run(ws.name, ws.desc, ws.icon, ws.ownerId, 'active');
    workspaceIds.push(result.lastInsertRowid);
    console.log(`  🏢 워크스페이스 생성: ${ws.name}`);
}

// 3. 워크스페이스 멤버 추가
const insertMember = db.prepare(`
    INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
    VALUES (?, ?, ?, ?)
`);

// 첫 번째 워크스페이스에 모든 사용자 추가
insertMember.run(workspaceIds[0], userIds[0], 'admin', null);
insertMember.run(workspaceIds[0], userIds[1], 'editor', userIds[0]);
insertMember.run(workspaceIds[0], userIds[2], 'viewer', userIds[0]);
console.log('  👥 워크스페이스 멤버 추가됨');

// 4. 카테고리 생성
const insertCategory = db.prepare(`
    INSERT INTO categories (workspace_id, name, description, sort_order)
    VALUES (?, ?, ?, ?)
`);

const categories = [
    { wsId: workspaceIds[0], name: '매장 준비', desc: '오픈 전 준비사항', order: 1 },
    { wsId: workspaceIds[0], name: '음료 제조', desc: '음료 레시피 및 제조법', order: 2 },
    { wsId: workspaceIds[0], name: '고객 응대', desc: '고객 서비스 가이드', order: 3 },
    { wsId: workspaceIds[0], name: '마감 정리', desc: '영업 종료 후 정리', order: 4 },
];

const categoryIds = [];
for (const cat of categories) {
    const result = insertCategory.run(cat.wsId, cat.name, cat.desc, cat.order);
    categoryIds.push(result.lastInsertRowid);
    console.log(`  📁 카테고리 생성: ${cat.name}`);
}

// 5. 문서(매뉴얼) 생성
const insertDocument = db.prepare(`
    INSERT INTO documents (category_id, title, status, visibility, created_by)
    VALUES (?, ?, ?, ?, ?)
`);

const documents = [
    { catId: categoryIds[0], title: '오픈 체크리스트', status: 'published', visibility: 'private', createdBy: userIds[0] },
    { catId: categoryIds[0], title: '청소 가이드', status: 'published', visibility: 'private', createdBy: userIds[0] },
    { catId: categoryIds[1], title: '아메리카노 제조법', status: 'published', visibility: 'public_free', createdBy: userIds[1] },
    { catId: categoryIds[1], title: '라떼 제조법', status: 'draft', visibility: 'private', createdBy: userIds[1] },
    { catId: categoryIds[2], title: '주문 접수 가이드', status: 'published', visibility: 'private', createdBy: userIds[0] },
];

const documentIds = [];
for (const doc of documents) {
    const result = insertDocument.run(doc.catId, doc.title, doc.status, doc.visibility, doc.createdBy);
    documentIds.push(result.lastInsertRowid);
    console.log(`  📄 문서 생성: ${doc.title}`);
}

// 6. 블록 생성
const insertBlock = db.prepare(`
    INSERT INTO blocks (document_id, block_type, content, sort_order)
    VALUES (?, ?, ?, ?)
`);

// 오픈 체크리스트 블록들
const openChecklistBlocks = [
    { type: 'text', content: '# 매장 오픈 체크리스트\n\n매일 아침 오픈 전 확인해야 할 사항들입니다.', order: 1 },
    { type: 'text', content: '## 1. 전기 및 설비 점검\n\n1. 메인 전원 ON\n2. 에어컨/난방 가동\n3. 조명 점검', order: 2 },
    { type: 'text', content: '## 2. 커피 머신 준비\n\n1. 머신 전원 ON (예열 15분)\n2. 물통 확인\n3. 원두 충전', order: 3 },
    { type: 'text', content: '## 3. 재료 점검\n\n- 우유 재고 확인\n- 시럽류 확인\n- 컵/빨대 확인', order: 4 },
];

for (const block of openChecklistBlocks) {
    insertBlock.run(documentIds[0], block.type, block.content, block.order);
}
console.log('  📝 블록 생성: 오픈 체크리스트 (4개 블록)');

// 아메리카노 제조법 블록들
const americanoBlocks = [
    { type: 'text', content: '# 아메리카노 제조법\n\n기본 아메리카노 제조 가이드입니다.', order: 1 },
    { type: 'text', content: '## 재료\n\n- 에스프레소 샷: 2샷 (약 30ml)\n- 정수물: 150ml (아이스의 경우 얼음 + 물 120ml)', order: 2 },
    { type: 'text', content: '## HOT 아메리카노\n\n1. 컵에 뜨거운 물 150ml를 먼저 담습니다\n2. 에스프레소 2샷을 추출하여 위에 부어줍니다\n3. 가볍게 저어 섞어줍니다', order: 3 },
    { type: 'text', content: '## ICE 아메리카노\n\n1. 컵에 얼음을 가득 채웁니다\n2. 차가운 물 120ml를 넣습니다\n3. 에스프레소 2샷을 추출하여 위에 부어줍니다', order: 4 },
];

for (const block of americanoBlocks) {
    insertBlock.run(documentIds[2], block.type, block.content, block.order);
}
console.log('  📝 블록 생성: 아메리카노 제조법 (4개 블록)');

// 7. 버전 생성 (샘플)
const insertVersion = db.prepare(`
    INSERT INTO document_versions (document_id, version_number, snapshot, change_summary, created_by)
    VALUES (?, ?, ?, ?, ?)
`);

insertVersion.run(documentIds[0], 1, JSON.stringify(openChecklistBlocks), '최초 작성', userIds[0]);
insertVersion.run(documentIds[2], 1, JSON.stringify(americanoBlocks), '최초 작성', userIds[1]);
console.log('  📜 버전 기록 생성됨');

// 8. 활동 로그 생성
const insertLog = db.prepare(`
    INSERT INTO activity_logs (user_id, workspace_id, action_type, target_type, target_id, details)
    VALUES (?, ?, ?, ?, ?, ?)
`);

insertLog.run(userIds[0], workspaceIds[0], 'create', 'workspace', workspaceIds[0], JSON.stringify({ name: '카페 운영 매뉴얼' }));
insertLog.run(userIds[0], workspaceIds[0], 'create', 'document', documentIds[0], JSON.stringify({ title: '오픈 체크리스트' }));
insertLog.run(userIds[1], workspaceIds[0], 'create', 'document', documentIds[2], JSON.stringify({ title: '아메리카노 제조법' }));
console.log('  📊 활동 로그 생성됨');

// 9. 즐겨찾기 추가
const insertFavorite = db.prepare(`
    INSERT INTO favorites (user_id, document_id)
    VALUES (?, ?)
`);

insertFavorite.run(userIds[0], documentIds[0]);
insertFavorite.run(userIds[1], documentIds[2]);
console.log('  ⭐ 즐겨찾기 추가됨');

// 데이터베이스 연결 종료
db.close();

console.log('\n✅ 데이터베이스 초기화 완료!');
console.log('\n📊 생성된 데이터 요약:');
console.log(`   - 사용자: ${users.length}명`);
console.log(`   - 워크스페이스: ${workspaces.length}개`);
console.log(`   - 카테고리: ${categories.length}개`);
console.log(`   - 문서: ${documents.length}개`);
console.log(`   - 블록: ${openChecklistBlocks.length + americanoBlocks.length}개`);

console.log('\n📁 데이터베이스 파일 위치: database/manualic.db');
console.log('\n🔐 테스트 계정:');
console.log('   - admin@manualic.com / admin123 (관리자)');
console.log('   - user1@example.com / user123 (편집자)');
console.log('   - user2@example.com / user123 (뷰어)');
