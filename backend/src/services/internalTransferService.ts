import { createCoreDbConnection } from '../utils/database';

export const internalTransferService = {
  // 获取内转数据（分页）
  async getInternalTransferData(startDate?: string, endDate?: string, page: number = 1, pageSize: number = 10) {
    // 参数验证
    const validPage = Math.max(1, parseInt(page.toString()));
    const validPageSize = Math.min(Math.max(1, parseInt(pageSize.toString())), 100); // 限制最大页面大小为100
    try {
      // 构建优化的SQL查询
      let sql = `
        SELECT 
          DATE_FORMAT(date_series.date_col, '%Y-%m-%d') AS query_date,
          
          -- 1. 注册人数
          COALESCE(register_stats.register_count, 0) AS register_count,
          
          -- 2. OCR全部识别完成人数
          COALESCE(ocr_stats.ocr_count, 0) AS real_name_auth_count,
          
          -- 3. 个人信息提交人数
          COALESCE(info_stats.info_count, 0) AS credit_info_count,
          
          -- 4. 个人信息推送给合作伙伴人数
          COALESCE(upload_stats.upload_count, 0) AS info_push_count,
          
          -- 5. 获取授信成功人数
          COALESCE(credit_stats.credit_count, 0) AS credit_success_count,
          
          -- 6. 提交贷款成功人数
          COALESCE(loan_stats.loan_count, 0) AS loan_success_count

        FROM (
            -- 生成最近30天的日期序列（MySQL 5.7兼容）
            SELECT DATE_SUB(CURDATE(), INTERVAL (a.a + (10 * b.a)) DAY) AS date_col
            FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
            CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2) AS b
            WHERE DATE_SUB(CURDATE(), INTERVAL (a.a + (10 * b.a)) DAY) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
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
            -- OCR完成人数统计
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT user_id) AS ocr_count
            FROM user_ocr_record 
            WHERE recognition_status = 1 
                AND event_name IN ('check', 'liveness-check', 'face-recognition')
            GROUP BY DATE(created_at), user_id
            HAVING COUNT(DISTINCT event_name) = 3
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
            -- 个人信息推送成功人数统计
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT user_id) AS upload_count
            FROM user_upload_records 
            WHERE status = 'success'
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
            WHERE status = 1
            GROUP BY DATE(created_at)
        ) loan_stats ON loan_stats.date_col = date_series.date_col

        WHERE date_series.date_col IS NOT NULL
      `;

      // 添加日期筛选条件
      if (startDate && endDate) {
        sql += ` AND date_series.date_col BETWEEN '${startDate}' AND '${endDate}'`;
      } else if (startDate) {
        sql += ` AND date_series.date_col >= '${startDate}'`;
      } else if (endDate) {
        sql += ` AND date_series.date_col <= '${endDate}'`;
      }

      sql += `
        GROUP BY date_series.date_col
        ORDER BY date_series.date_col DESC
        LIMIT ${(validPage - 1) * validPageSize}, ${validPageSize}
      `;

      // 构建总数查询SQL - 使用与主查询相同的逻辑
      let countSql = `
        SELECT COUNT(*) as total
        FROM (
            -- 生成最近30天的日期序列（MySQL 5.7兼容）
            SELECT DATE_SUB(CURDATE(), INTERVAL (a.a + (10 * b.a)) DAY) AS date_col
            FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
            CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2) AS b
            WHERE DATE_SUB(CURDATE(), INTERVAL (a.a + (10 * b.a)) DAY) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ) AS date_series
      `;

      // 添加总数查询的日期筛选条件
      if (startDate && endDate) {
        countSql += ` WHERE date_series.date_col BETWEEN '${startDate}' AND '${endDate}'`;
      } else if (startDate) {
        countSql += ` WHERE date_series.date_col >= '${startDate}'`;
      } else if (endDate) {
        countSql += ` WHERE date_series.date_col <= '${endDate}'`;
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
            page: validPage,
            limit: validPageSize,
            total: total,
            totalPages: Math.ceil(total / validPageSize)
          }
        };
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('查询内转数据失败:', error);
      throw error;
    }
  },

  // 获取内转数据图表（不分页）
  async getInternalTransferChartData(startDate?: string, endDate?: string) {
    try {
      // 构建图表数据查询SQL
      let sql = `
        SELECT 
          DATE_FORMAT(date_series.date_col, '%Y-%m-%d') AS query_date,
          
          -- 1. 注册人数
          COALESCE(register_stats.register_count, 0) AS register_count,
          
          -- 2. OCR全部识别完成人数
          COALESCE(ocr_stats.ocr_count, 0) AS real_name_auth_count,
          
          -- 3. 个人信息提交人数
          COALESCE(info_stats.info_count, 0) AS credit_info_count,
          
          -- 4. 个人信息推送给合作伙伴人数
          COALESCE(upload_stats.upload_count, 0) AS info_push_count,
          
          -- 5. 获取授信成功人数
          COALESCE(credit_stats.credit_count, 0) AS credit_success_count,
          
          -- 6. 提交贷款成功人数
          COALESCE(loan_stats.loan_count, 0) AS loan_success_count

        FROM (
            -- 生成最近30天的日期序列（MySQL 5.7兼容）
            SELECT DATE_SUB(CURDATE(), INTERVAL (a.a + (10 * b.a)) DAY) AS date_col
            FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
            CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2) AS b
            WHERE DATE_SUB(CURDATE(), INTERVAL (a.a + (10 * b.a)) DAY) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
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
            -- OCR完成人数统计
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT user_id) AS ocr_count
            FROM user_ocr_record 
            WHERE recognition_status = 1 
                AND event_name IN ('check', 'liveness-check', 'face-recognition')
            GROUP BY DATE(created_at), user_id
            HAVING COUNT(DISTINCT event_name) = 3
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
            -- 个人信息推送成功人数统计
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT user_id) AS upload_count
            FROM user_upload_records 
            WHERE status = 'success'
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
            WHERE status = 1
            GROUP BY DATE(created_at)
        ) loan_stats ON loan_stats.date_col = date_series.date_col

        WHERE date_series.date_col IS NOT NULL
      `;

      // 添加日期筛选条件
      if (startDate && endDate) {
        sql += ` AND date_series.date_col BETWEEN '${startDate}' AND '${endDate}'`;
      } else if (startDate) {
        sql += ` AND date_series.date_col >= '${startDate}'`;
      } else if (endDate) {
        sql += ` AND date_series.date_col <= '${endDate}'`;
      }

      sql += `
        GROUP BY date_series.date_col
        ORDER BY date_series.date_col ASC
      `;

      // 执行查询
      const connection = await createCoreDbConnection();
      try {
        const [rows] = await connection.execute(sql);
        return rows;
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('查询内转图表数据失败:', error);
      throw error;
    }
  }
};
