-- 测试adjust_event_record表数据
-- 用于验证归因上报数据是否存在

USE pk_credit_core_pro;

-- 1. 检查表是否存在
SELECT '=== 1. 检查表是否存在 ===' AS 步骤;
SHOW TABLES LIKE 'adjust_event_record';

-- 2. 查看表中总记录数
SELECT '=== 2. 表中总记录数 ===' AS 步骤;
SELECT COUNT(*) AS 总记录数 FROM adjust_event_record;

-- 3. 查看所有事件名称
SELECT '=== 3. 所有事件名称 ===' AS 步骤;
SELECT 
    event_name AS 事件名称,
    COUNT(*) AS 记录数,
    COUNT(DISTINCT user_id) AS 用户数
FROM adjust_event_record 
GROUP BY event_name
ORDER BY 记录数 DESC;

-- 4. 查看状态分布
SELECT '=== 4. 状态分布 ===' AS 步骤;
SELECT 
    status AS 状态,
    CASE status
        WHEN 0 THEN '待处理'
        WHEN 1 THEN '成功'
        WHEN 2 THEN '失败'
        ELSE '未知'
    END AS 状态说明,
    COUNT(*) AS 记录数
FROM adjust_event_record 
GROUP BY status;

-- 5. 查看Registration事件的详情
SELECT '=== 5. Registration事件详情 ===' AS 步骤;
SELECT 
    event_name,
    status,
    COUNT(*) AS 记录数,
    COUNT(DISTINCT user_id) AS 用户数,
    MIN(created_at) AS 最早时间,
    MAX(created_at) AS 最晚时间
FROM adjust_event_record 
WHERE event_name LIKE '%egistration%'
GROUP BY event_name, status;

-- 6. 最近7天Registration成功的数据
SELECT '=== 6. 最近7天Registration成功数据（按日期） ===' AS 步骤;
SELECT 
    DATE(created_at) AS 日期,
    COUNT(DISTINCT user_id) AS 用户数,
    COUNT(*) AS 记录数
FROM adjust_event_record 
WHERE event_name = 'Registration' AND status = 1
    AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY 日期 DESC;

-- 7. 最近10条记录
SELECT '=== 7. 最近10条记录 ===' AS 步骤;
SELECT 
    id,
    user_id,
    event_name,
    status,
    created_at
FROM adjust_event_record 
ORDER BY created_at DESC
LIMIT 10;

-- 8. 如果adjust_event_record为空，检查apps_flyer_event_record
SELECT '=== 8. 检查AppsFlyer表 ===' AS 步骤;
SELECT COUNT(*) AS AppsFlyer记录数 FROM apps_flyer_event_record;

SELECT 
    event_name,
    status,
    COUNT(*) AS 记录数
FROM apps_flyer_event_record
GROUP BY event_name, status
ORDER BY 记录数 DESC
LIMIT 10;

