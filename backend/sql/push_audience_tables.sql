-- 推送人群表（仅保留基础信息）
CREATE TABLE IF NOT EXISTS `push_audiences` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `tags` TEXT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_updatedAt` (`updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 推送 Token 表
CREATE TABLE IF NOT EXISTS `push_tokens` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `token` VARCHAR(512) NOT NULL,
  `tags` TEXT NULL,
  `status` ENUM('active','revoked') NOT NULL DEFAULT 'active',
  `lastActiveAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_token` (`token`),
  KEY `idx_status` (`status`),
  KEY `idx_updatedAt` (`updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 人群与 Token 关联表
CREATE TABLE IF NOT EXISTS `push_audience_tokens` (
  `audienceId` INT UNSIGNED NOT NULL,
  `tokenId` INT UNSIGNED NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`audienceId`, `tokenId`),
  KEY `idx_token` (`tokenId`),
  CONSTRAINT `fk_audience` FOREIGN KEY (`audienceId`) REFERENCES `push_audiences` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_token` FOREIGN KEY (`tokenId`) REFERENCES `push_tokens` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

