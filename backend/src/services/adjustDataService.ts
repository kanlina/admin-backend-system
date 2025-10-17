import { createCoreDbConnection } from '../utils/database';

export const adjustDataService = {
  // 获取所有 Adjust 事件类型
  async getAllEventNames() {
    try {
      const sql = `
        SELECT DISTINCT event_name 
        FROM adjust_event_record 
        WHERE event_name IS NOT NULL AND event_name != ''
        ORDER BY event_name ASC
      `;
      
      console.log('开始获取 Adjust 事件类型列表...');
      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();
      
      const eventNames = (rows as any[]).map(row => row.event_name);
      console.log('获取到 Adjust 事件类型:', eventNames.length, '个:', eventNames);
      
      return eventNames;
    } catch (error) {
      console.error('获取 Adjust 事件类型列表失败:', error);
      throw error;
    }
  },

  // 获取 Adjust 上报数据（分页）
  async getAdjustData(startDate?: string, endDate?: string, page: number = 1, pageSize: number = 10) {
    const validPage = Math.max(1, parseInt(page.toString()));
    const validPageSize = Math.min(Math.max(1, parseInt(pageSize.toString())), 100);
    
    const defaultStartDate = startDate || 'DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    const defaultEndDate = endDate || 'CURDATE()';
    
    try {
      const eventNames = await this.getAllEventNames();
      
      if (eventNames.length === 0) {
        return {
          data: [],
          pagination: { page: validPage, limit: validPageSize, total: 0, totalPages: 0 },
          eventNames: []
        };
      }

      // 动态构建每个事件类型的统计子查询
      const eventStatsJoins = eventNames.map((eventName) => {
        const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
        const escapedEventName = eventName.replace(/'/g, "''");
        
        return `
        LEFT JOIN (
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT user_id) AS count_${sanitizedName}
            FROM adjust_event_record 
            WHERE event_name = '${escapedEventName}' AND status = 1
            GROUP BY DATE(created_at)
        ) stats_${sanitizedName} ON stats_${sanitizedName}.date_col = date_series.date_col`;
      }).join('\n');

      const selectColumns = eventNames.map((eventName) => {
        const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
        return `COALESCE(stats_${sanitizedName}.count_${sanitizedName}, 0) AS event_${sanitizedName}`;
      }).join(',\n          ');

      const sql = `
        SELECT 
          DATE_FORMAT(date_series.date_col, '%Y-%m-%d') AS query_date
          ${selectColumns ? ',' + selectColumns : ''}
        FROM (
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

      console.log('执行 Adjust 数据SQL查询，事件数量:', eventNames.length);
      
      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();

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
        pagination: { page: validPage, limit: validPageSize, total: total, totalPages: totalPages },
        eventNames: eventNames
      };

    } catch (error) {
      console.error('获取 Adjust 数据失败:', error);
      throw error;
    }
  },

  // 获取 Adjust 图表数据（不分页）
  async getAdjustChartData(startDate?: string, endDate?: string) {
    const defaultStartDate = startDate || 'DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    const defaultEndDate = endDate || 'CURDATE()';
    
    try {
      const eventNames = await this.getAllEventNames();
      
      if (eventNames.length === 0) {
        return { data: [], eventNames: [] };
      }

      const eventStatsJoins = eventNames.map((eventName) => {
        const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
        const escapedEventName = eventName.replace(/'/g, "''");
        
        return `
        LEFT JOIN (
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT user_id) AS count_${sanitizedName}
            FROM adjust_event_record 
            WHERE event_name = '${escapedEventName}' AND status = 1
            GROUP BY DATE(created_at)
        ) stats_${sanitizedName} ON stats_${sanitizedName}.date_col = date_series.date_col`;
      }).join('\n');

      const selectColumns = eventNames.map((eventName) => {
        const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
        return `COALESCE(stats_${sanitizedName}.count_${sanitizedName}, 0) AS event_${sanitizedName}`;
      }).join(',\n          ');

      const sql = `
        SELECT 
          DATE_FORMAT(date_series.date_col, '%Y-%m-%d') AS query_date
          ${selectColumns ? ',' + selectColumns : ''}
        FROM (
            SELECT DATE_ADD(${defaultStartDate}, INTERVAL (a.a + (10 * b.a)) DAY) AS date_col
            FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
            CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
            WHERE DATE_ADD(${defaultStartDate}, INTERVAL (a.a + (10 * b.a)) DAY) <= ${defaultEndDate}
        ) AS date_series
        ${eventStatsJoins}
        WHERE date_series.date_col IS NOT NULL
        ORDER BY date_series.date_col ASC
      `;

      console.log('执行 Adjust 图表SQL查询，事件数量:', eventNames.length);
      
      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();

      return { data: rows, eventNames: eventNames };

    } catch (error) {
      console.error('获取 Adjust 图表数据失败:', error);
      throw error;
    }
  }
};

