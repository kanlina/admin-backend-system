const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function fixPasswords() {
  try {
    console.log('🔧 修复用户密码...');
    
    // 生成正确的密码哈希
    const adminPassword = await bcrypt.hash('admin123', 12);
    const userPassword = await bcrypt.hash('user123', 12);
    
    console.log('新生成的密码哈希:');
    console.log(`admin123: ${adminPassword}`);
    console.log(`user123: ${userPassword}`);
    
    // 更新 admin 用户密码
    const adminUser = await prisma.user.update({
      where: { username: 'admin' },
      data: { password: adminPassword }
    });
    console.log('✅ admin 用户密码已更新');
    
    // 更新 testuser 用户密码
    const testUser = await prisma.user.update({
      where: { username: 'testuser' },
      data: { password: userPassword }
    });
    console.log('✅ testuser 用户密码已更新');
    
    // 验证密码
    const adminValid = await bcrypt.compare('admin123', adminUser.password);
    const userValid = await bcrypt.compare('user123', testUser.password);
    
    console.log(`admin123 验证结果: ${adminValid}`);
    console.log(`user123 验证结果: ${userValid}`);
    
  } catch (error) {
    console.error('❌ 密码修复失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixPasswords();
