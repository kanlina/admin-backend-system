-- Content 内容管理表（用于连接 id-998 项目的数据库）
-- 如果 id-998 项目的数据库中已有此表，则无需执行此脚本
-- 如果需要在 admin-backend 数据库中创建，请执行此脚本

CREATE TABLE IF NOT EXISTS `content` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `appId` INT(11) NOT NULL DEFAULT 15 COMMENT '应用ID',
  `parentId` INT(11) NOT NULL DEFAULT 10 COMMENT '父级ID（用于分类树）',
  `type` TINYINT(1) NOT NULL DEFAULT 2 COMMENT '类型：1=分类，2=文章',
  `title` VARCHAR(255) NOT NULL COMMENT '标题',
  `subtitle` VARCHAR(255) DEFAULT NULL COMMENT '副标题',
  `author` VARCHAR(100) DEFAULT NULL COMMENT '作者',
  `content` TEXT COMMENT '内容（HTML）',
  `alias` VARCHAR(255) DEFAULT NULL COMMENT '别名（URL友好）',
  `urlPath` VARCHAR(255) DEFAULT NULL COMMENT 'URL路径',
  `titleImg01` VARCHAR(500) DEFAULT NULL COMMENT '缩略图URL',
  `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用：0=禁用，1=启用',
  `publishedAt` DATETIME DEFAULT NULL COMMENT '发布时间',
  `sortNum` INT(11) NOT NULL DEFAULT 0 COMMENT '排序号',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_appId` (`appId`),
  KEY `idx_parentId` (`parentId`),
  KEY `idx_type` (`type`),
  KEY `idx_enabled` (`enabled`),
  KEY `idx_alias` (`alias`),
  KEY `idx_urlPath` (`urlPath`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容管理表';

