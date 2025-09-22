const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🔍 测试数据库连接...');
    
    // 测试连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功');
    
    // 检查用户表
    const userCount = await prisma.user.count();
    console.log(`📊 用户表中有 ${userCount} 个用户`);
    
    // 列出所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    
    console.log('👥 用户列表:');
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.email}) - ${user.role} - ${user.isActive ? '活跃' : '禁用'}`);
    });
    
    // 检查特定用户
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    });
    
    if (adminUser) {
      console.log('✅ 找到 admin 用户:');
      console.log(`  - ID: ${adminUser.id}`);
      console.log(`  - 用户名: ${adminUser.username}`);
      console.log(`  - 邮箱: ${adminUser.email}`);
      console.log(`  - 角色: ${adminUser.role}`);
      console.log(`  - 状态: ${adminUser.isActive ? '活跃' : '禁用'}`);
      console.log(`  - 密码哈希: ${adminUser.password.substring(0, 20)}...`);
    } else {
      console.log('❌ 未找到 admin 用户');
    }
    
  } catch (error) {
    console.error('❌ 数据库测试失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
