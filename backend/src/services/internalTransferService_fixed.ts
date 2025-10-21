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
          COALESCE(register_stats.register_count, 0) AS register_count,
          
          -- 2. 归因上报-Registration
          COALESCE(adjust_registration_stats.registration_count, 0) AS adjust_registration_count,
          
          -- 3. OCR全部识别完成人数
          COALESCE(ocr_stats.ocr_count, 0) AS real_name_auth_count,
          
          -- 4. 个人信息提交人数
          COALESCE(info_stats.info_count, 0) AS credit_info_count,
          
          -- 5. 推送总人数
          COALESCE(push_total_stats.push_total_count, 0) AS push_total_count,
          
          -- 6. 个人信息推送给合作伙伴人数
          COALESCE(upload_stats.upload_count, 0) AS info_push_count,
          
          -- 6. 获取授信成功人数
          COALESCE(credit_stats.credit_count, 0) AS credit_success_count,
          
          -- 7. 提交贷款人数（所有状态）
          COALESCE(loan_submit_stats.loan_count, 0) AS loan_success_count,
          
          -- 8. 借款成功人数（status=1）
          COALESCE(loan_approved_stats.loan_approved_count, 0) AS loan_approved_count,
          
          -- 9. 已还款人数（repayment_status=1）
          COALESCE(loan_repaid_stats.loan_repaid_count, 0) AS loan_repaid_count

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
            -- 个人信息提交人数统计（按verification_success_at字段统计认证成功的日期）
            SELECT 
                DATE(verification_success_at) AS date_col,
                COUNT(DISTINCT user_id) AS info_count
            FROM user_info 
            WHERE verification_success_at IS NOT NULL
            GROUP BY DATE(verification_success_at)
        ) info_stats ON info_stats.date_col = date_series.date_col

        LEFT JOIN (
            -- 推送总人数统计
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT user_id) AS push_total_count
            FROM user_upload_records
            GROUP BY DATE(created_at)
        ) push_total_stats ON push_total_stats.date_col = date_series.date_col

        LEFT JOIN (
            -- 个人信息推送给合作伙伴人数统计
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT user_id) AS upload_count
            FROM user_upload_records
            WHERE status = "success"
            GROUP BY DATE(created_at)
        ) upload_stats ON upload_stats.date_col = date_series.date_col

        LEFT JOIN (
            -- 授信成功人数统计
          SELECT
          DATE(credit.created_at) AS date_col,
          COUNT(DISTINCT credit.user_id) AS credit_count
          FROM (
          SELECT
          user_id,
          MIN(created_at) AS created_at
          FROM user_credit_record
          WHERE credit_status = 2
          GROUP BY user_id
          ) AS credit
          GROUP BY DATE(credit.created_at)
        ) credit_stats ON credit_stats.date_col = date_series.date_col

        LEFT JOIN (
            -- 提交贷款人数统计（所有状态）
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT id) AS loan_count
            FROM user_loans
            GROUP BY DATE(created_at)
        ) loan_submit_stats ON loan_submit_stats.date_col = date_series.date_col

        LEFT JOIN (
            -- 借款成功人数统计（status=1）
          SELECT
          DATE(plan.created_at) AS date_col,
          COUNT(DISTINCT plan.order_no) AS loan_approved_count
          FROM (
          SELECT
          order_no,
          MIN(created_at) AS created_at
          FROM scheduled_repay_plan
          WHERE partner_order_status = 2
          GROUP BY order_no
          ) AS plan
          GROUP BY DATE(plan.created_at)
        ) loan_approved_stats ON loan_approved_stats.date_col = date_series.date_col

        LEFT JOIN (
            -- 已还款人数统计（假设partner_order_status=3表示已还款，请根据实际情况调整）
          SELECT
          DATE(plan.created_at) AS date_col,
          COUNT(DISTINCT plan.order_no) AS loan_repaid_count
          FROM (
          SELECT
          order_no,
          MIN(created_at) AS created_at
          FROM scheduled_repay_plan
          WHERE partner_order_status = 3
          GROUP BY order_no
          ) AS plan
          GROUP BY DATE(plan.created_at)
        ) loan_repaid_stats ON loan_repaid_stats.date_col = date_series.date_col

        WHERE date_series.date_col IS NOT NULL
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
          COALESCE(register_stats.register_count, 0) AS register_count,
          
          -- 2. 归因上报-Registration
          COALESCE(adjust_registration_stats.registration_count, 0) AS adjust_registration_count,
          
          -- 3. OCR全部识别完成人数
          COALESCE(ocr_stats.ocr_count, 0) AS real_name_auth_count,
          
          -- 4. 个人信息提交人数
          COALESCE(info_stats.info_count, 0) AS credit_info_count,
          
          -- 5. 推送总人数
          COALESCE(push_total_stats.push_total_count, 0) AS push_total_count,
          
          -- 6. 个人信息推送给合作伙伴人数
          COALESCE(upload_stats.upload_count, 0) AS info_push_count,
          
          -- 6. 获取授信成功人数
          COALESCE(credit_stats.credit_count, 0) AS credit_success_count,
          
          -- 7. 提交贷款人数（所有状态）
          COALESCE(loan_submit_stats.loan_count, 0) AS loan_success_count,
          
          -- 8. 借款成功人数（status=1）
          COALESCE(loan_approved_stats.loan_approved_count, 0) AS loan_approved_count,
          
          -- 9. 已还款人数（repayment_status=1）
          COALESCE(loan_repaid_stats.loan_repaid_count, 0) AS loan_repaid_count

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
            -- 个人信息提交人数统计（按verification_success_at字段统计认证成功的日期）
            SELECT 
                DATE(verification_success_at) AS date_col,
                COUNT(DISTINCT user_id) AS info_count
            FROM user_info 
            WHERE verification_success_at IS NOT NULL
            GROUP BY DATE(verification_success_at)
        ) info_stats ON info_stats.date_col = date_series.date_col

        LEFT JOIN (
            -- 个人信息推送给合作伙伴人数统计
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT user_id) AS upload_count
            FROM user_upload_records 
            WHERE status = "success"
            GROUP BY DATE(created_at)
        ) upload_stats ON upload_stats.date_col = date_series.date_col

        LEFT JOIN (
            -- 授信成功人数统计
          SELECT
          DATE(credit.created_at) AS date_col,
          COUNT(DISTINCT credit.user_id) AS credit_count
          FROM (
          SELECT
          user_id,
          MIN(created_at) AS created_at
          FROM user_credit_record
          WHERE credit_status = 2
          GROUP BY user_id
          ) AS credit
          GROUP BY DATE(credit.created_at)
        ) credit_stats ON credit_stats.date_col = date_series.date_col

          LEFT JOIN (
          -- 提交贷款人数统计（所有状态）
          SELECT
          DATE(created_at) AS date_col,
          COUNT(DISTINCT order_no) AS loan_count
          FROM user_loans
          GROUP BY DATE(created_at)
          ) loan_submit_stats ON loan_submit_stats.date_col = date_series.date_col

          LEFT JOIN (
          -- 借款成功人数统计（status=1）
          SELECT
          DATE(plan.created_at) AS date_col,
          COUNT(DISTINCT plan.order_no) AS loan_approved_count
          FROM (
          SELECT
          order_no,
          MIN(created_at) AS created_at
          FROM scheduled_repay_plan
          WHERE partner_order_status = 2
          GROUP BY order_no
          ) AS plan
          GROUP BY DATE(plan.created_at)
          ) loan_approved_stats ON loan_approved_stats.date_col = date_series.date_col

          LEFT JOIN (
          -- 已还款人数统计（假设partner_order_status=3表示已还款，请根据实际情况调整）
          SELECT
          DATE(plan.created_at) AS date_col,
          COUNT(DISTINCT plan.order_no) AS loan_repaid_count
          FROM (
          SELECT
          order_no,
          MIN(created_at) AS created_at
          FROM scheduled_repay_plan
          WHERE partner_order_status = 3
          GROUP BY order_no
          ) AS plan
          GROUP BY DATE(plan.created_at)
          ) loan_repaid_stats ON loan_repaid_stats.date_col = date_series.date_col

        WHERE date_series.date_col IS NOT NULL
        ORDER BY date_series.date_col ASC
      `;

      console.log('执行图表SQL查询:', sql);
      
      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();

      // 打印返回的数据用于调试
      console.log('图表查询返回的数据行数:', (rows as any).length);
      if ((rows as any).length > 0) {
        console.log('图表第一行数据:', (rows as any)[0]);
        console.log('图表数据字段名:', Object.keys((rows as any)[0]));
      }

      return rows;

    } catch (error) {
      console.error('获取内转图表数据失败:', error);
      throw error;
    }
  }
};
