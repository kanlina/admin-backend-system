import { createCoreDbConnection } from '../utils/database';

export const internalTransferService = {
  // 获取内转数据（分页）
  async getInternalTransferData(startDate?: string, endDate?: string, page: number = 1, pageSize: number = 10) {
    // 参数验证
    const validPage = Math.max(1, parseInt(page.toString()));
    const validPageSize = Math.min(Math.max(1, parseInt(pageSize.toString())), 100); // 限制最大页面大小为100
    
    // 确定日期范围
    const defaultStartDate = startDate || 'DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    const defaultEndDate = endDate || 'CURDATE()';
    
    try {
      // 构建优化的SQL查询
      let sql = `
        SELECT 
          DATE_FORMAT(date_series.date_col, '%Y-%m-%d') AS query_date,
          
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
            -- 根据时间范围生成日期序列（MySQL 5.7兼容）
            SELECT DATE_ADD('${defaultStartDate}', INTERVAL (a.a + (10 * b.a)) DAY) AS date_col
            FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
            CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
            WHERE DATE_ADD('${defaultStartDate}', INTERVAL (a.a + (10 * b.a)) DAY) <= '${defaultEndDate}'
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
            -- OCR全部识别完成人数统计
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT user_id) AS ocr_count
            FROM user_ocr_record 
            WHERE status = 2
            GROUP BY DATE(created_at)
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
      `;

      // 日期筛选条件已经在日期序列生成时处理，无需重复添加

      sql += `
        GROUP BY date_series.date_col
        ORDER BY date_series.date_col DESC
        LIMIT ${validPageSize} OFFSET ${(validPage - 1) * validPageSize}
      `;

      console.log('执行SQL查询:', sql);
      
      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();

      // 获取总数
      const countSql = `
        SELECT COUNT(*) as total
        FROM (
            -- 根据时间范围生成日期序列（MySQL 5.7兼容）
            SELECT DATE_ADD('${defaultStartDate}', INTERVAL (a.a + (10 * b.a)) DAY) AS date_col
            FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
            CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
            WHERE DATE_ADD('${defaultStartDate}', INTERVAL (a.a + (10 * b.a)) DAY) <= '${defaultEndDate}'
        ) AS date_series
        WHERE date_series.date_col IS NOT NULL
      `;

      const countConnection = await createCoreDbConnection();
      const [countRows] = await countConnection.execute(countSql);
      await countConnection.end();

      const total = (countRows as any)[0]?.total || 0;
      const totalPages = Math.ceil(total / validPageSize);

      return {
        data: rows,
        pagination: {
          page: validPage,
          limit: validPageSize,
          total: total,
          totalPages: totalPages
        }
      };

    } catch (error) {
      console.error('获取内转数据失败:', error);
      throw error;
    }
  },

  // 获取内转图表数据（不分页）
  async getInternalTransferChartData(startDate?: string, endDate?: string) {
    // 确定日期范围
    const defaultStartDate = startDate || 'DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    const defaultEndDate = endDate || 'CURDATE()';
    
    try {
      // 构建优化的SQL查询
      let sql = `
        SELECT 
          DATE_FORMAT(date_series.date_col, '%Y-%m-%d') AS query_date,
          
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
            -- 根据时间范围生成日期序列（MySQL 5.7兼容）
            SELECT DATE_ADD('${defaultStartDate}', INTERVAL (a.a + (10 * b.a)) DAY) AS date_col
            FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
            CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
            WHERE DATE_ADD('${defaultStartDate}', INTERVAL (a.a + (10 * b.a)) DAY) <= '${defaultEndDate}'
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
            -- OCR全部识别完成人数统计
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT user_id) AS ocr_count
            FROM user_ocr_record 
            WHERE status = 2
            GROUP BY DATE(created_at)
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
      `;

      // 日期筛选条件已经在日期序列生成时处理，无需重复添加

      sql += `
        GROUP BY date_series.date_col
        ORDER BY date_series.date_col ASC
      `;

      console.log('执行图表SQL查询:', sql);
      
      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();

      return rows;

    } catch (error) {
      console.error('获取内转图表数据失败:', error);
      throw error;
    }
  }
};
