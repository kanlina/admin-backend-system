-- 管理后台系统数据库初始化脚本

-- 创建用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(191) NOT NULL,
  `username` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL DEFAULT 'USER',
  `avatar` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `users_username_key`(`username`),
  UNIQUE INDEX `users_email_key`(`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建标签表
CREATE TABLE IF NOT EXISTS `tags` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `color` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `tags_name_key`(`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建文章表
CREATE TABLE IF NOT EXISTS `posts` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `summary` VARCHAR(191) NULL,
  `cover` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `views` INTEGER NOT NULL DEFAULT 0,
  `authorId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `posts_authorId_fkey`(`authorId`),
  CONSTRAINT `posts_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建评论表
CREATE TABLE IF NOT EXISTS `comments` (
  `id` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `postId` VARCHAR(191) NOT NULL,
  `authorId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `comments_postId_fkey`(`postId`),
  INDEX `comments_authorId_fkey`(`authorId`),
  CONSTRAINT `comments_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `comments_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建文章标签关联表
CREATE TABLE IF NOT EXISTS `post_tags` (
  `postId` VARCHAR(191) NOT NULL,
  `tagId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`postId`, `tagId`),
  INDEX `post_tags_tagId_fkey`(`tagId`),
  CONSTRAINT `post_tags_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `post_tags_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS `system_configs` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `value` TEXT NOT NULL,
  `type` VARCHAR(191) NOT NULL DEFAULT 'STRING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `system_configs_key_key`(`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 插入默认数据
-- 注意：密码需要使用 bcrypt 加密，这里先插入明文，后续需要更新
INSERT IGNORE INTO `users` (`id`, `username`, `email`, `password`, `role`, `isActive`, `createdAt`, `updatedAt`) VALUES
('admin_user_id', 'admin', 'admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J7QjK8K2C', 'ADMIN', true, NOW(), NOW()),
('test_user_id', 'testuser', 'user@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J7QjK8K2C', 'USER', true, NOW(), NOW());

-- 插入示例标签
INSERT IGNORE INTO `tags` (`id`, `name`, `color`, `createdAt`, `updatedAt`) VALUES
('tag_tech', '技术', '#1890ff', NOW(), NOW()),
('tag_life', '生活', '#52c41a', NOW(), NOW()),
('tag_study', '学习', '#faad14', NOW(), NOW()),
('tag_work', '工作', '#f5222d', NOW(), NOW());

-- 插入示例文章
INSERT IGNORE INTO `posts` (`id`, `title`, `content`, `summary`, `status`, `views`, `authorId`, `createdAt`, `updatedAt`) VALUES
('post_1', '欢迎使用管理后台系统', '# 欢迎使用管理后台系统\n\n这是一个功能完整的管理后台系统，包含以下特性：\n\n## 主要功能\n\n- **用户管理**: 支持用户注册、登录、权限管理\n- **文章管理**: 支持文章的创建、编辑、发布、归档\n- **标签管理**: 支持标签的创建和管理\n- **权限控制**: 基于角色的访问控制\n- **响应式设计**: 支持移动端和桌面端\n\n## 技术栈\n\n### 后端\n- Node.js + Express\n- TypeScript\n- Prisma ORM\n- SQLite/MySQL/PostgreSQL\n- JWT 认证\n\n### 前端\n- React + TypeScript\n- Ant Design\n- Vite\n- React Router\n\n## 快速开始\n\n1. 安装依赖\n2. 配置数据库\n3. 运行迁移\n4. 启动服务\n\n祝您使用愉快！', '介绍管理后台系统的主要功能和技术栈', 'PUBLISHED', 0, 'admin_user_id', NOW(), NOW()),
('post_2', '系统使用指南', '# 系统使用指南\n\n## 用户角色说明\n\n### 管理员 (ADMIN)\n- 可以管理所有用户\n- 可以管理所有文章\n- 可以管理系统设置\n- 拥有最高权限\n\n### 版主 (MODERATOR)\n- 可以管理文章\n- 可以管理标签\n- 可以查看用户信息\n\n### 普通用户 (USER)\n- 可以创建和管理自己的文章\n- 可以查看公开内容\n\n## 操作指南\n\n### 创建文章\n1. 点击"文章管理"\n2. 点击"新建文章"\n3. 填写标题、内容等信息\n4. 选择标签和状态\n5. 保存或发布\n\n### 管理标签\n1. 点击"标签管理"\n2. 可以创建、编辑、删除标签\n3. 为标签设置颜色\n\n### 用户管理（仅管理员）\n1. 点击"用户管理"\n2. 可以查看、编辑、删除用户\n3. 可以修改用户角色和状态', '详细介绍系统的使用方法和操作指南', 'PUBLISHED', 0, 'admin_user_id', NOW(), NOW());

-- 插入文章标签关联
INSERT IGNORE INTO `post_tags` (`postId`, `tagId`) VALUES
('post_1', 'tag_tech'),
('post_1', 'tag_study'),
('post_2', 'tag_tech');

-- 插入系统配置
INSERT IGNORE INTO `system_configs` (`id`, `key`, `value`, `type`, `createdAt`, `updatedAt`) VALUES
('config_1', 'site_name', '管理后台系统', 'STRING', NOW(), NOW()),
('config_2', 'site_description', '一个功能完整的管理后台系统', 'STRING', NOW(), NOW()),
('config_3', 'posts_per_page', '10', 'NUMBER', NOW(), NOW());
