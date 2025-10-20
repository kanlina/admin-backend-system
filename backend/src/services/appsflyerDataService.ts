import { createCoreDbConnection } from '../utils/database';

export const appsflyerDataService = {
  // 获取所有 AppsFlyer 事件类型
  async getAllEventNames() {
    try {
      const sql = `
        SELECT DISTINCT event_name 
        FROM appsflyer_callback
        WHERE event_name IS NOT NULL AND event_name != ''
        ORDER BY event_name ASC
      `;
      
      console.log('🔍 [AppsFlyer] 开始查询事件类型列表...');
      console.log('SQL:', sql.trim());
      
      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();
      
      const eventNames = (rows as any[]).map(row => row.event_name);
      console.log('✅ [AppsFlyer] 获取到事件类型:', eventNames.length, '个');
      console.log('事件列表:', eventNames);
      
      return eventNames;
    } catch (error) {
      console.error('❌ [AppsFlyer] 获取事件类型列表失败:', error);
      throw error;
    }
  },

  // 获取所有 app_id
  async getAllAppIds() {
    try {
      const sql = `
        SELECT DISTINCT app_id 
        FROM appsflyer_callback 
        WHERE app_id IS NOT NULL AND app_id != ''
        ORDER BY app_id ASC
      `;
      console.log('🔍 [AppsFlyer] 开始查询 app_id 列表...');
      console.log('SQL:', sql.trim());
      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();
      const appIds = (rows as any[]).map(row => row.app_id);
      console.log('✅ [AppsFlyer] 获取到 app_id 数量:', appIds.length);
      console.log('app_id 列表:', appIds);
      return appIds;
    } catch (error) {
      console.error('❌ [AppsFlyer] 获取 app_id 列表失败:', error);
      throw error;
    }
  },


  // 获取所有 media_source
  async getAllMediaSources() {
    try {
      const sql = `
        SELECT DISTINCT media_source 
        FROM appsflyer_callback 
        WHERE media_source IS NOT NULL AND media_source != ''
        ORDER BY media_source ASC
      `;
      
      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();
      
      return (rows as any[]).map(row => row.media_source);
    } catch (error) {
      console.error('获取 media_source 列表失败:', error);
      throw error;
    }
  },

  // 获取 AppsFlyer 回调数据（分页，支持筛选）
  async getAppsflyerData(
    startDate?: string, 
    endDate?: string, 
    page: number = 1, 
    pageSize: number = 10,
    appId?: string,
    mediaSource?: string
  ) {
    const validPage = Math.max(1, parseInt(page.toString()));
    const validPageSize = Math.min(Math.max(1, parseInt(pageSize.toString())), 100);
    
    // 处理日期参数，如果是具体日期则加引号，如果是SQL函数则不加
    const defaultStartDate = startDate ? `'${startDate}'` : 'DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    const defaultEndDate = endDate ? `'${endDate}'` : 'CURDATE()';
    
    try {
      const eventNames = await this.getAllEventNames();
      
      if (eventNames.length === 0) {
        return {
          data: [],
          pagination: { page: validPage, limit: validPageSize, total: 0, totalPages: 0 },
          eventNames: []
        };
      }

      // 构建筛选条件
      const filterConditions = [];
      if (appId) {
        const escapedAppId = appId.replace(/'/g, "''");
        filterConditions.push(`app_id = '${escapedAppId}'`);
      }
      if (mediaSource) {
        const escapedMediaSource = mediaSource.replace(/'/g, "''");
        filterConditions.push(`media_source = '${escapedMediaSource}'`);
      }
      const additionalWhere = filterConditions.length > 0 ? `AND ${filterConditions.join(' AND ')}` : '';

      // 动态构建每个事件类型的统计子查询
      const eventStatsJoins = eventNames.map((eventName) => {
        const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
        const escapedEventName = eventName.replace(/'/g, "''");
        
        return `
        LEFT JOIN (
           SELECT
          DATE(callback.created_at) AS date_col,
          COUNT(callback.appsflyer_id) AS count_${sanitizedName}
          FROM (
          SELECT
          appsflyer_id,
          MIN(created_at) AS created_at
          FROM appsflyer_callback
          WHERE event_name = '${escapedEventName}' 
          AND callback_status = 'processed'
          ${additionalWhere}
          GROUP BY id
          ) AS callback
          GROUP BY DATE(callback.created_at)
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

      console.log('🔍 [AppsFlyer] 执行数据查询');
      console.log('事件数量:', eventNames.length);
      console.log('日期范围:', defaultStartDate, '到', defaultEndDate);
      console.log('筛选条件:', { appId, mediaSource });
      console.log('筛选条件:', { appId, mediaSource });
      console.log('分页参数:', { page: validPage, pageSize: validPageSize });
      console.log('完整SQL语句:');
      console.log(sql);
      console.log('--- SQL结束 ---');
      
      const connection = await createCoreDbConnection();
      const startTime = Date.now();
      const [rows] = await connection.execute(sql);
      const queryTime = Date.now() - startTime;
      await connection.end();
      
      console.log(`✅ [AppsFlyer] 查询完成，耗时: ${queryTime}ms, 返回记录数: ${(rows as any[]).length}`);
      if ((rows as any[]).length > 0) {
        console.log('第一条记录示例:', (rows as any[])[0]);
      }

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
        pagination: { page: validPage, limit: validPageSize, total: total, totalPages: totalPages },
        eventNames: eventNames
      };

    } catch (error) {
      console.error('获取 AppsFlyer 数据失败:', error);
      throw error;
    }
  },

  // 获取 AppsFlyer 图表数据（不分页，支持筛选）
  async getAppsflyerChartData(
    startDate?: string, 
    endDate?: string,
    appId?: string,
    mediaSource?: string
  ) {
    // 处理日期参数，如果是具体日期则加引号，如果是SQL函数则不加
    const defaultStartDate = startDate ? `'${startDate}'` : 'DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    const defaultEndDate = endDate ? `'${endDate}'` : 'CURDATE()';
    
    try {
      const eventNames = await this.getAllEventNames();
      
      if (eventNames.length === 0) {
        return { data: [], eventNames: [] };
      }

      // 构建筛选条件
      const filterConditions = [];
      if (appId) {
        const escapedAppId = appId.replace(/'/g, "''");
        filterConditions.push(`app_id = '${escapedAppId}'`);
      }
      if (mediaSource) {
        const escapedMediaSource = mediaSource.replace(/'/g, "''");
        filterConditions.push(`media_source = '${escapedMediaSource}'`);
      }
      const filterWhere = filterConditions.length > 0 ? `AND ${filterConditions.join(' AND ')}` : '';

      const eventStatsJoins = eventNames.map((eventName) => {
        const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
        const escapedEventName = eventName.replace(/'/g, "''");
        
        return `
        LEFT JOIN (
            SELECT 
                DATE(created_at) AS date_col,
                COUNT(DISTINCT customer_user_id) AS count_${sanitizedName}
            FROM appsflyer_callback
            WHERE event_name = '${escapedEventName}' 
              AND callback_status = 'processed'
              AND customer_user_id IS NOT NULL
              ${filterWhere}
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

      console.log('执行 AppsFlyer 图表SQL查询，事件数量:', eventNames.length);
      
      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();

      return { data: rows, eventNames: eventNames };

    } catch (error) {
      console.error('获取 AppsFlyer 图表数据失败:', error);
      throw error;
    }
  }
};

