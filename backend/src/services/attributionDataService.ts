import { createCoreDbConnection } from '../utils/database';

export const attributionDataService = {
  // 获取所有事件类型（支持多数据源）
  async getAllEventNames(_dataSource: 'adjust' | 'appsflyer' = 'adjust') {
    try {
      const sql = `
        SELECT DISTINCT event_name 
        FROM adjust_event_config
        WHERE is_enabled = 1
          AND event_name IS NOT NULL
          AND event_name <> ''
        ORDER BY event_name ASC
      `;
      
      console.log('开始获取事件类型列表 [adjust_event_config]...');
      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();
      
      const eventNames = (rows as any[]).map(row => row.event_name);
      console.log('获取到事件类型 [adjust_event_config]:', eventNames.length, '个:', eventNames);
      
      return eventNames;
    } catch (error) {
      console.error('获取事件类型列表失败:', error);
      throw error;
    }
  },

  // 获取归因数据（分页）- 动态查询所有事件类型
  async getAttributionData(startDate?: string, endDate?: string, page: number = 1, pageSize: number = 10, dataSource: 'adjust' | 'appsflyer' = 'adjust') {
    // 参数验证
    const validPage = Math.max(1, parseInt(page.toString()));
    const validPageSize = Math.min(Math.max(1, parseInt(pageSize.toString())), 100);
    
    // 确定日期范围
    const defaultStartDate = startDate || 'DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    const defaultEndDate = endDate || 'CURDATE()';
    
    try {
      // 首先获取所有事件类型
      const eventNames = await this.getAllEventNames(dataSource);
      const tableName = dataSource === 'adjust' ? 'adjust_event_record' : 'appsflyer_callback';
      const statusField = dataSource === 'adjust' ? 'status' : 'callback_status';
      const statusValue = dataSource === 'adjust' ? '1' : "'processed'";
      const dateField = 'created_at';
      
      if (eventNames.length === 0) {
        return {
          data: [],
          pagination: {
            page: validPage,
            limit: validPageSize,
            total: 0,
            totalPages: 0
          },
          eventNames: []
        };
      }

      // 动态构建每个事件类型的统计子查询
      const eventStatsJoins = eventNames.map((eventName, index) => {
        const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
        const escapedEventName = eventName.replace(/'/g, "''");
        // 根据数据源选择去重字段
        const distinctField = dataSource === 'adjust' ? 'user_id' : 'customer_user_id';
        
        return `
        LEFT JOIN (
            SELECT 
                DATE(${dateField}) AS date_col,
                COUNT(DISTINCT ${distinctField}) AS count_${sanitizedName}
            FROM ${tableName}
            WHERE event_name = '${escapedEventName}' AND ${statusField} = ${statusValue}
            GROUP BY DATE(${dateField})
        ) stats_${sanitizedName} ON stats_${sanitizedName}.date_col = date_series.date_col`;
      }).join('\n');

      // 动态构建 SELECT 列
      const selectColumns = eventNames.map((eventName) => {
        const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
        return `COALESCE(stats_${sanitizedName}.count_${sanitizedName}, 0) AS event_${sanitizedName}`;
      }).join(',\n          ');

      const sql = `
        SELECT 
          DATE_FORMAT(date_series.date_col, '%Y-%m-%d') AS query_date
          ${selectColumns ? ',' + selectColumns : ''}
        FROM (
            -- 根据时间范围生成日期序列（MySQL 5.7兼容）
            SELECT DATE_ADD(${defaultStartDate}, INTERVAL (a.a + (10 * b.a)) DAY) AS date_col
            FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
            CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
            WHERE DATE_ADD(${defaultStartDate}, INTERVAL (a.a + (10 * b.a)) DAY) <= ${defaultEndDate}
        ) AS date_series
        ${eventStatsJoins}
        WHERE date_series.date_col IS NOT NULL
        ORDER BY date_series.date_col DESC
        LIMIT ${validPageSize} OFFSET ${(validPage - 1) * validPageSize}
      `;

      console.log(`执行动态归因数据SQL查询 [${dataSource}]，事件数量:`, eventNames.length);
      console.log('SQL 预览:', sql.substring(0, 500));
      
      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();

      // 获取总数
      const countSql = `
        SELECT COUNT(*) as total
        FROM (
            SELECT DATE_ADD(${defaultStartDate}, INTERVAL (a.a + (10 * b.a)) DAY) AS date_col
            FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
            CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
            WHERE DATE_ADD(${defaultStartDate}, INTERVAL (a.a + (10 * b.a)) DAY) <= ${defaultEndDate}
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
        },
        eventNames: eventNames // 返回事件名称列表供前端使用
      };

    } catch (error) {
      console.error('获取归因数据失败:', error);
      throw error;
    }
  },

  // 获取归因图表数据（不分页）- 动态查询所有事件类型
  async getAttributionChartData(startDate?: string, endDate?: string, dataSource: 'adjust' | 'appsflyer' = 'adjust') {
    // 确定日期范围
    const defaultStartDate = startDate || 'DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    const defaultEndDate = endDate || 'CURDATE()';
    
    try {
      // 首先获取所有事件类型
      const eventNames = await this.getAllEventNames(dataSource);
      const tableName = dataSource === 'adjust' ? 'adjust_event_record' : 'appsflyer_callback';
      const statusField = dataSource === 'adjust' ? 'status' : 'callback_status';
      const statusValue = dataSource === 'adjust' ? '1' : "'processed'";
      const dateField = 'created_at';
      
      if (eventNames.length === 0) {
        return {
          data: [],
          eventNames: []
        };
      }

      // 动态构建每个事件类型的统计子查询
      const eventStatsJoins = eventNames.map((eventName) => {
        const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
        const escapedEventName = eventName.replace(/'/g, "''");
        const distinctField = dataSource === 'adjust' ? 'user_id' : 'customer_user_id';
        
        return `
        LEFT JOIN (
            SELECT 
                DATE(${dateField}) AS date_col,
                COUNT(DISTINCT ${distinctField}) AS count_${sanitizedName}
            FROM ${tableName}
            WHERE event_name = '${escapedEventName}' AND ${statusField} = ${statusValue}
            GROUP BY DATE(${dateField})
        ) stats_${sanitizedName} ON stats_${sanitizedName}.date_col = date_series.date_col`;
      }).join('\n');

      // 动态构建 SELECT 列
      const selectColumns = eventNames.map((eventName) => {
        const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
        return `COALESCE(stats_${sanitizedName}.count_${sanitizedName}, 0) AS event_${sanitizedName}`;
      }).join(',\n          ');

      const sql = `
        SELECT 
          DATE_FORMAT(date_series.date_col, '%Y-%m-%d') AS query_date
          ${selectColumns ? ',' + selectColumns : ''}
        FROM (
            -- 根据时间范围生成日期序列（MySQL 5.7兼容）
            SELECT DATE_ADD(${defaultStartDate}, INTERVAL (a.a + (10 * b.a)) DAY) AS date_col
            FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
            CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
            WHERE DATE_ADD(${defaultStartDate}, INTERVAL (a.a + (10 * b.a)) DAY) <= ${defaultEndDate}
        ) AS date_series
        ${eventStatsJoins}
        WHERE date_series.date_col IS NOT NULL
        ORDER BY date_series.date_col ASC
      `;

      console.log(`执行动态归因图表SQL查询 [${dataSource}]，事件数量:`, eventNames.length);
      
      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();

      // 打印返回的数据用于调试
      console.log('归因图表查询返回的数据行数:', (rows as any).length);
      if ((rows as any).length > 0) {
        console.log('归因图表第一行数据:', (rows as any)[0]);
        console.log('归因图表数据字段名:', Object.keys((rows as any)[0]));
      }

      return {
        data: rows,
        eventNames: eventNames
      };

    } catch (error) {
      console.error('获取归因图表数据失败:', error);
      throw error;
    }
  }
};

