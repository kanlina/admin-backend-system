const bcrypt = require('bcryptjs');

async function testPassword() {
  try {
    console.log('🔍 测试密码验证...');
    
    // 测试原始密码
    const plainPassword = 'admin123';
    console.log(`原始密码: ${plainPassword}`);
    
    // 生成新的哈希
    const newHash = await bcrypt.hash(plainPassword, 12);
    console.log(`新生成的哈希: ${newHash}`);
    
    // 验证新哈希
    const isValidNew = await bcrypt.compare(plainPassword, newHash);
    console.log(`新哈希验证结果: ${isValidNew}`);
    
    // 测试数据库中的哈希
    const dbHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J7QjK8K2C';
    const isValidDb = await bcrypt.compare(plainPassword, dbHash);
    console.log(`数据库哈希验证结果: ${isValidDb}`);
    
    // 测试其他可能的密码
    const testPasswords = ['admin', 'admin123', 'password', '123456'];
    for (const pwd of testPasswords) {
      const result = await bcrypt.compare(pwd, dbHash);
      console.log(`密码 "${pwd}" 验证结果: ${result}`);
    }
    
  } catch (error) {
    console.error('❌ 密码测试失败:', error.message);
  }
}

testPassword();
