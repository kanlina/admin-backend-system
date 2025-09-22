import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  // 创建管理员用户
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  // 创建测试用户
  const userPassword = await hashPassword('user123');
  const user = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      username: 'testuser',
      email: 'user@example.com',
      password: userPassword,
      role: 'USER',
      isActive: true,
    },
  });

  // 创建示例标签
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { name: '技术' },
      update: {},
      create: {
        name: '技术',
        color: '#1890ff',
      },
    }),
    prisma.tag.upsert({
      where: { name: '生活' },
      update: {},
      create: {
        name: '生活',
        color: '#52c41a',
      },
    }),
    prisma.tag.upsert({
      where: { name: '学习' },
      update: {},
      create: {
        name: '学习',
        color: '#faad14',
      },
    }),
    prisma.tag.upsert({
      where: { name: '工作' },
      update: {},
      create: {
        name: '工作',
        color: '#f5222d',
      },
    }),
  ]);

  // 创建示例文章
  const posts = await Promise.all([
    prisma.post.create({
      data: {
        title: '欢迎使用管理后台系统',
        content: `
# 欢迎使用管理后台系统

这是一个功能完整的管理后台系统，包含以下特性：

## 主要功能

- **用户管理**: 支持用户注册、登录、权限管理
- **文章管理**: 支持文章的创建、编辑、发布、归档
- **标签管理**: 支持标签的创建和管理
- **权限控制**: 基于角色的访问控制
- **响应式设计**: 支持移动端和桌面端

## 技术栈

### 后端
- Node.js + Express
- TypeScript
- Prisma ORM
- SQLite/MySQL/PostgreSQL
- JWT 认证

### 前端
- React + TypeScript
- Ant Design
- Vite
- React Router

## 快速开始

1. 安装依赖
2. 配置数据库
3. 运行迁移
4. 启动服务

祝您使用愉快！
        `,
        summary: '介绍管理后台系统的主要功能和技术栈',
        status: 'PUBLISHED',
        authorId: admin.id,
        views: 0,
        tags: {
          create: [
            { tag: { connect: { id: tags[0].id } } },
            { tag: { connect: { id: tags[2].id } } },
          ],
        },
      },
    }),
    prisma.post.create({
      data: {
        title: '系统使用指南',
        content: `
# 系统使用指南

## 用户角色说明

### 管理员 (ADMIN)
- 可以管理所有用户
- 可以管理所有文章
- 可以管理系统设置
- 拥有最高权限

### 版主 (MODERATOR)
- 可以管理文章
- 可以管理标签
- 可以查看用户信息

### 普通用户 (USER)
- 可以创建和管理自己的文章
- 可以查看公开内容

## 操作指南

### 创建文章
1. 点击"文章管理"
2. 点击"新建文章"
3. 填写标题、内容等信息
4. 选择标签和状态
5. 保存或发布

### 管理标签
1. 点击"标签管理"
2. 可以创建、编辑、删除标签
3. 为标签设置颜色

### 用户管理（仅管理员）
1. 点击"用户管理"
2. 可以查看、编辑、删除用户
3. 可以修改用户角色和状态
        `,
        summary: '详细介绍系统的使用方法和操作指南',
        status: 'PUBLISHED',
        authorId: admin.id,
        views: 0,
        tags: {
          create: [
            { tag: { connect: { id: tags[0].id } } },
          ],
        },
      },
    }),
  ]);

  // 创建系统配置
  await Promise.all([
    prisma.systemConfig.upsert({
      where: { key: 'site_name' },
      update: {},
      create: {
        key: 'site_name',
        value: '管理后台系统',
        type: 'STRING',
      },
    }),
    prisma.systemConfig.upsert({
      where: { key: 'site_description' },
      update: {},
      create: {
        key: 'site_description',
        value: '一个功能完整的管理后台系统',
        type: 'STRING',
      },
    }),
    prisma.systemConfig.upsert({
      where: { key: 'posts_per_page' },
      update: {},
      create: {
        key: 'posts_per_page',
        value: '10',
        type: 'NUMBER',
      },
    }),
  ]);

  console.log('数据库初始化完成！');
  console.log('默认管理员账户:');
  console.log('用户名: admin');
  console.log('密码: admin123');
  console.log('邮箱: admin@example.com');
  console.log('');
  console.log('测试用户账户:');
  console.log('用户名: testuser');
  console.log('密码: user123');
  console.log('邮箱: user@example.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
