import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// MariaDB 연결 풀 생성
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'manualic',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 연결 테스트
pool.getConnection()
  .then(conn => {
    console.log('✅ MariaDB 연결 성공');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MariaDB 연결 실패:', err.message);
  });

export default pool;
