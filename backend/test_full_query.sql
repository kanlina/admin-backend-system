-- 测试完整的内转数据查询SQL
-- 用于验证adjust_registration_count字段是否能正确返回

USE pk_credit_core_pro;

SET @defaultStartDate = DATE_SUB(CURDATE(), INTERVAL 7 DAY);
SET @defaultEndDate = CURDATE();

SELECT 
    DATE_FORMAT(date_series.date_col, '%Y-%m-%d') AS query_date,
    
    -- 1. 注册人数
    COALESCE(register_stats.register_count, 0) AS register_count,
    
    -- 2. 归因上报-Registration
    COALESCE(adjust_registration_stats.registration_count, 0) AS adjust_registration_count,
    
    -- 3. OCR全部识别完成人数
    COALESCE(ocr_stats.ocr_count, 0) AS real_name_auth_count,
    
    -- 4. 个人信息提交人数
    COALESCE(info_stats.info_count, 0) AS credit_info_count,
    
    -- 5. 个人信息推送给合作伙伴人数
    COALESCE(upload_stats.upload_count, 0) AS info_push_count,
    
    -- 6. 获取授信成功人数
    COALESCE(credit_stats.credit_count, 0) AS credit_success_count,
    
    -- 7. 提交贷款成功人数
    COALESCE(loan_stats.loan_count, 0) AS loan_success_count

FROM (
    -- 根据时间范围生成日期序列（MySQL 5.7兼容）
    SELECT DATE_ADD(@defaultStartDate, INTERVAL (a.a + (10 * b.a)) DAY) AS date_col
    FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
    CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
    WHERE DATE_ADD(@defaultStartDate, INTERVAL (a.a + (10 * b.a)) DAY) <= @defaultEndDate
) AS date_series

LEFT JOIN (
    -- 注册人数统计
    SELECT 
        DATE(request_time) AS date_col,
        COUNT(DISTINCT user_id) AS register_count
    FROM user_login_record 
    WHERE is_new_user = 1
    GROUP BY DATE(request_time)
) register_stats ON register_stats.date_col = date_series.date_col

LEFT JOIN (
    -- 归因上报-Registration统计
    SELECT 
        DATE(created_at) AS date_col,
        COUNT(DISTINCT user_id) AS registration_count
    FROM adjust_event_record 
    WHERE event_name = 'Registration' AND status = 1
    GROUP BY DATE(created_at)
) adjust_registration_stats ON adjust_registration_stats.date_col = date_series.date_col

LEFT JOIN (
    -- OCR全部识别完成人数统计（从user_ocr_record表查询首次完成face-recognition事件的去重用户）
    SELECT 
        DATE(first_completion.created_at) AS date_col,
        COUNT(DISTINCT first_completion.user_id) AS ocr_count
    FROM (
        SELECT 
            user_id,
            MIN(created_at) AS created_at
        FROM user_ocr_record
        WHERE event_name = 'face-recognition' 
            AND recognition_status = 1
        GROUP BY user_id
    ) AS first_completion
    GROUP BY DATE(first_completion.created_at)
) ocr_stats ON ocr_stats.date_col = date_series.date_col

LEFT JOIN (
    -- 个人信息提交人数统计
    SELECT 
        DATE(created_at) AS date_col,
        COUNT(DISTINCT user_id) AS info_count
    FROM user_info 
    GROUP BY DATE(created_at)
) info_stats ON info_stats.date_col = date_series.date_col

LEFT JOIN (
    -- 个人信息推送给合作伙伴人数统计
    SELECT 
        DATE(created_at) AS date_col,
        COUNT(DISTINCT user_id) AS upload_count
    FROM user_upload_record 
    WHERE status = 1
    GROUP BY DATE(created_at)
) upload_stats ON upload_stats.date_col = date_series.date_col

LEFT JOIN (
    -- 授信成功人数统计
    SELECT 
        DATE(created_at) AS date_col,
        COUNT(DISTINCT user_id) AS credit_count
    FROM user_credit 
    WHERE credit_status = 2
    GROUP BY DATE(created_at)
) credit_stats ON credit_stats.date_col = date_series.date_col

LEFT JOIN (
    -- 借款成功人数统计
    SELECT 
        DATE(created_at) AS date_col,
        COUNT(DISTINCT id) AS loan_count
    FROM user_loans 
    GROUP BY DATE(created_at)
) loan_stats ON loan_stats.date_col = date_series.date_col

WHERE date_series.date_col IS NOT NULL
ORDER BY date_series.date_col DESC
LIMIT 10;

