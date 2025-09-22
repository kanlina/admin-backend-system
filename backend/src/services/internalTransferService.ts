import { createCoreDbConnection } from '../utils/database';

export const internalTransferService = {
  async getInternalTransferData(startDate?: string, endDate?: string, page: number = 1, pageSize: number = 10) {
    try {
      // 构建优化的SQL查询
      let sql = `
        SELECT 
          date_stats.date_col AS query_date,
          
          -- 1. 注册人数
          COALESCE(register_stats.register_count, 0) AS "注册人数",
          
          -- 2. OCR全部识别完成人数
          COALESCE(ocr_stats.ocr_count, 0) AS "实名认证完成人数",
          
          -- 3. 个人信息提交人数
          COALESCE(info_stats.info_count, 0) AS "获取个信人数",
          
          -- 4. 个人信息推送给合作伙伴人数
          COALESCE(upload_stats.upload_count, 0) AS "个人信息推送成功人数",
          
          -- 5. 获取授信成功人数
          COALESCE(credit_stats.credit_count, 0) AS "授信成功人数",
          
          -- 6. 提交贷款成功人数
          COALESCE(loan_stats.loan_count, 0) AS "借款成功人数"

        FROM (
            -- 获取日期范围
            SELECT DISTINCT DATE(request_time) AS date_col 
            FROM user_login_record 
            WHERE request_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            UNION
            SELECT DISTINCT DATE(created_at) AS date_col 
            FROM user_ocr_record 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            UNION
            SELECT DISTINCT DATE(created_at) AS date_col 
            FROM user_info 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            UNION
            SELECT DISTINCT DATE(created_at) AS date_col 
            FROM user_upload_records 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            UNION
            SELECT DISTINCT DATE(created_at) AS date_col 
            FROM user_credit 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            UNION
            SELECT DISTINCT DATE(created_at) AS date_col 
            FROM user_loans 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ) AS date_stats

        LEFT JOIN (
            -- 注册人数统计
            SELECT 
                DATE(request_time) AS date_col,
                COUNT(DISTINCT user_id) AS register_count
            FROM user_login_record 
            WHERE is_new_user = 1
            GROUP BY DATE(request_time)
        ) register_stats ON register_stats.date_col = date_stats.date_col

        LEFT JOIN (
            -- OCR完成人数统计
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT user_id) AS ocr_count
            FROM user_ocr_record 
            WHERE recognition_status = 1 
                AND event_name IN ('check', 'liveness-check', 'face-recognition')
            GROUP BY DATE(created_at), user_id
            HAVING COUNT(DISTINCT event_name) = 3
        ) ocr_stats ON ocr_stats.date_col = date_stats.date_col

        LEFT JOIN (
            -- 个人信息提交人数统计
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT user_id) AS info_count
            FROM user_info 
            GROUP BY DATE(created_at)
        ) info_stats ON info_stats.date_col = date_stats.date_col

        LEFT JOIN (
            -- 个人信息推送成功人数统计
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT user_id) AS upload_count
            FROM user_upload_records 
            WHERE status = 'success'
            GROUP BY DATE(created_at)
        ) upload_stats ON upload_stats.date_col = date_stats.date_col

        LEFT JOIN (
            -- 授信成功人数统计
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT user_id) AS credit_count
            FROM user_credit 
            WHERE credit_status = 2
            GROUP BY DATE(created_at)
        ) credit_stats ON credit_stats.date_col = date_stats.date_col

        LEFT JOIN (
            -- 借款成功人数统计
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT id) AS loan_count
            FROM user_loans 
            GROUP BY DATE(created_at)
        ) loan_stats ON loan_stats.date_col = date_stats.date_col

        WHERE date_stats.date_col IS NOT NULL
      `;

      // 添加日期筛选条件
      if (startDate && endDate) {
        sql += ` AND date_stats.date_col BETWEEN '${startDate}' AND '${endDate}'`;
      } else if (startDate) {
        sql += ` AND date_stats.date_col >= '${startDate}'`;
      } else if (endDate) {
        sql += ` AND date_stats.date_col <= '${endDate}'`;
      }

      sql += `
        GROUP BY date_stats.date_col
        ORDER BY date_stats.date_col DESC
        LIMIT ${(page - 1) * pageSize}, ${pageSize}
      `;

      // 构建总数查询SQL
      let countSql = `
        SELECT COUNT(*) as total
        FROM (
            SELECT DISTINCT DATE(request_time) AS date_col 
            FROM user_login_record 
            WHERE request_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            UNION
            SELECT DISTINCT DATE(created_at) AS date_col 
            FROM user_ocr_record 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            UNION
            SELECT DISTINCT DATE(created_at) AS date_col 
            FROM user_info 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            UNION
            SELECT DISTINCT DATE(created_at) AS date_col 
            FROM user_upload_records 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            UNION
            SELECT DISTINCT DATE(created_at) AS date_col 
            FROM user_credit 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            UNION
            SELECT DISTINCT DATE(created_at) AS date_col 
            FROM user_loans 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ) AS date_stats
        WHERE date_stats.date_col IS NOT NULL
      `;

      // 添加总数查询的日期筛选条件
      if (startDate && endDate) {
        countSql += ` AND date_stats.date_col BETWEEN '${startDate}' AND '${endDate}'`;
      } else if (startDate) {
        countSql += ` AND date_stats.date_col >= '${startDate}'`;
      } else if (endDate) {
        countSql += ` AND date_stats.date_col <= '${endDate}'`;
      }

      // 执行查询
      const connection = await createCoreDbConnection();
      try {
        // 执行数据查询
        const [rows] = await connection.execute(sql);
        
        // 执行总数查询
        const [countResult] = await connection.execute(countSql);
        const total = (countResult as any)[0].total;

        return {
          data: rows,
          pagination: {
            current: page,
            pageSize: pageSize,
            total: total,
            totalPages: Math.ceil(total / pageSize)
          }
        };
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('查询内转数据失败:', error);
      throw error;
    }
  }
};
