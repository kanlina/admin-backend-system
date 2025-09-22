-- 删除文章管理相关表的 SQL 脚本

-- 删除文章标签关联表
DROP TABLE IF EXISTS `post_tags`;

-- 删除评论表
DROP TABLE IF EXISTS `comments`;

-- 删除文章表
DROP TABLE IF EXISTS `posts`;

-- 更新用户表，移除文章相关字段的引用
-- 注意：用户表本身不需要修改，只是移除了关联关系

-- 更新标签表，移除文章相关字段的引用
-- 注意：标签表本身不需要修改，只是移除了关联关系

-- 验证表是否已删除
SHOW TABLES;
