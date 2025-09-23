-- 数据库性能优化建议
-- 为内转数据查询创建必要的索引

-- 1. user_login_record 表索引
CREATE INDEX IF NOT EXISTS idx_user_login_record_time_new_user 
ON user_login_record(request_time, is_new_user);

CREATE INDEX IF NOT EXISTS idx_user_login_record_user_time 
ON user_login_record(user_id, request_time);

-- 2. user_ocr_record 表索引
CREATE INDEX IF NOT EXISTS idx_user_ocr_record_status_event_time 
ON user_ocr_record(recognition_status, event_name, created_at);

CREATE INDEX IF NOT EXISTS idx_user_ocr_record_user_time 
ON user_ocr_record(user_id, created_at);

-- 3. user_info 表索引
CREATE INDEX IF NOT EXISTS idx_user_info_created_at 
ON user_info(created_at);

CREATE INDEX IF NOT EXISTS idx_user_info_user_created 
ON user_info(user_id, created_at);

-- 4. user_upload_records 表索引
CREATE INDEX IF NOT EXISTS idx_user_upload_records_status_time 
ON user_upload_records(status, created_at);

CREATE INDEX IF NOT EXISTS idx_user_upload_records_user_time 
ON user_upload_records(user_id, created_at);

-- 5. user_credit 表索引
CREATE INDEX IF NOT EXISTS idx_user_credit_status_time 
ON user_credit(credit_status, created_at);

CREATE INDEX IF NOT EXISTS idx_user_credit_user_time 
ON user_credit(user_id, created_at);

-- 6. user_loans 表索引
CREATE INDEX IF NOT EXISTS idx_user_loans_created_at 
ON user_loans(created_at);

CREATE INDEX IF NOT EXISTS idx_user_loans_id_time 
ON user_loans(id, created_at);

-- 复合索引优化（根据查询模式）
CREATE INDEX IF NOT EXISTS idx_user_login_record_composite 
ON user_login_record(is_new_user, request_time, user_id);

CREATE INDEX IF NOT EXISTS idx_user_ocr_record_composite 
ON user_ocr_record(recognition_status, event_name, created_at, user_id);

-- 分析表统计信息（MySQL 8.0+）
-- ANALYZE TABLE user_login_record;
-- ANALYZE TABLE user_ocr_record;
-- ANALYZE TABLE user_info;
-- ANALYZE TABLE user_upload_records;
-- ANALYZE TABLE user_credit;
-- ANALYZE TABLE user_loans;
