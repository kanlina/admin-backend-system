import { createCoreDbConnection } from '../utils/database';

export const appsflyerDataServiceOptimized = {
  // 获取所有 AppsFlyer 事件类型
  async getAllEventNames() {
    try {
      const sql = `
        SELECT DISTINCT event_name 
        FROM appsflyer_callback
        WHERE event_name IS NOT NULL AND event_name != ''
        ORDER BY event_name ASC
      `;
      
      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();
      
      const eventNames = (rows as any[]).map(row => row.event_name);
      console.log('✅ [AppsFlyer] 获取事件类型:', eventNames.length, '个');
      
      return eventNames;
    } catch (error) {
      console.error('❌ [AppsFlyer] 获取事件类型失败:', error);
      throw error;
    }
  },

  // 获取所有 app_id
  async getAllAppIds() {
    try {
      const sql = `
        SELECT DISTINCT event_value_app_id as app_id
        FROM appsflyer_callback 
        WHERE event_value_app_id IS NOT NULL AND event_value_app_id != ''
        UNION
        SELECT DISTINCT app_id
        FROM appsflyer_callback 
        WHERE app_id IS NOT NULL AND app_id != ''
        ORDER BY app_id ASC
      `;
      
      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();
      
      const appIds = (rows as any[]).map(row => row.app_id);
      console.log('✅ [AppsFlyer] 获取 app_id:', appIds.length, '个');
      return appIds;
    } catch (error) {
      console.error('❌ [AppsFlyer] 获取 app_id 失败:', error);
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
      console.error('获取 media_source 失败:', error);
      throw error;
    }
  },

  // 获取所有广告序列 (af_c_id)
  async getAllAdSequences(mediaSource?: string) {
    try {
      let sql = `
        SELECT DISTINCT af_c_id 
        FROM appsflyer_callback 
        WHERE af_c_id IS NOT NULL AND af_c_id != ''
      `;
      
      if (mediaSource && mediaSource.trim()) {
        const sources = mediaSource.split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .map(s => `'${s.replace(/'/g, "''")}'`)
          .join(',');
        sql += ` AND media_source IN (${sources})`;
      }
      
      sql += ` ORDER BY af_c_id ASC`;

      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();

      return (rows as any[]).map(row => row.af_c_id);
    } catch (error) {
      console.error('获取 af_c_id 失败:', error);
      throw error;
    }
  },

  // 🚀 优化后的统一查询方法（支持分页和不分页）
  async getAppsflyerData(options: {
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
    appId?: string;
    mediaSource?: string;
    adSequence?: string;
    adPairs?: string;
    mediasWithoutAd?: string;
    isPaginated?: boolean;
  }) {
    const {
      startDate,
      endDate,
      page = 1,
      pageSize = 10,
      appId,
      mediaSource,
      adSequence,
      adPairs,
      mediasWithoutAd,
      isPaginated = true
    } = options;

    const validPage = Math.max(1, parseInt(page.toString()));
    const validPageSize = Math.min(Math.max(1, parseInt(pageSize.toString())), 100);
    
    const defaultStartDate = startDate ? `'${startDate}'` : 'DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    const defaultEndDate = endDate ? `'${endDate}'` : 'CURDATE()';
    
    try {
      // 获取所有事件类型
      const eventNames = await this.getAllEventNames();
      
      if (eventNames.length === 0) {
        return isPaginated 
          ? { data: [], pagination: { page: validPage, limit: validPageSize, total: 0, totalPages: 0 }, eventNames: [] }
          : { data: [], eventNames: [] };
      }

      // 解析筛选条件
      const { combos, whereClause } = this.parseFilters({
        appId,
        mediaSource,
        adSequence,
        adPairs,
        mediasWithoutAd
      });

      // 🎯 核心优化：使用条件聚合代替多次JOIN
      const eventColumns = eventNames.map(eventName => {
        const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
        const escapedEventName = eventName.replace(/'/g, "''");
        return `SUM(CASE WHEN event_name = '${escapedEventName}' THEN 1 ELSE 0 END) AS event_${sanitizedName}`;
      }).join(',\n        ');

      // 构建主查询
      const dataQuery = combos.map(({ mediaVal, adVal }) => {
        const escapedMedia = mediaVal.replace(/'/g, "''");
        const escapedAd = adVal.replace(/'/g, "''");
        const whereByMedia = mediaVal !== 'ALL' ? `AND media_source = '${escapedMedia}'` : '';
        const whereByAd = adVal !== 'ALL' ? `AND af_c_id = '${escapedAd}'` : '';

        return `
      SELECT 
        ds.date_col AS query_date,
        '${escapedMedia}' AS media_source,
        '${escapedAd}' AS ad_sequence,
        ${eventColumns.replace(/\n        /g, '\n        ')}
      FROM (
        -- 日期序列生成（优化：只生成需要的日期范围）
        SELECT DATE_ADD(${defaultStartDate}, INTERVAL seq DAY) AS date_col
        FROM (
          SELECT a.N + b.N * 10 AS seq
          FROM 
            (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 
             UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
            (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 
             UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
        ) seq_table
        WHERE DATE_ADD(${defaultStartDate}, INTERVAL seq DAY) <= ${defaultEndDate}
      ) ds
      LEFT JOIN appsflyer_callback ac 
        ON DATE(ac.created_at) = ds.date_col
        AND ac.callback_status = 'processed'
        ${whereClause}
        ${whereByMedia}
        ${whereByAd}
      GROUP BY ds.date_col
      ORDER BY ds.date_col DESC`;
      }).join('\n      UNION ALL\n');

      // 分页或不分页
      const paginationClause = isPaginated 
        ? `LIMIT ${validPageSize} OFFSET ${(validPage - 1) * validPageSize}`
        : '';

      const finalSql = `
    SELECT * FROM (
      ${dataQuery}
    ) combined_data
    ORDER BY query_date DESC, media_source ASC, ad_sequence ASC
    ${paginationClause}
      `;

      console.log('🔍 [AppsFlyer-优化] 执行查询');
      console.log('事件数量:', eventNames.length);
      console.log('日期范围:', defaultStartDate, '到', defaultEndDate);
      console.log('筛选条件:', { appId, mediaSource, adSequence });
      if (isPaginated) {
        console.log('分页参数:', { page: validPage, pageSize: validPageSize });
      }
      
      const connection = await createCoreDbConnection();
      const startTime = Date.now();
      const [rows] = await connection.execute(finalSql);
      const queryTime = Date.now() - startTime;
      
      console.log(`✅ [AppsFlyer-优化] 查询完成，耗时: ${queryTime}ms, 返回: ${(rows as any[]).length} 条`);

      // 获取总数（仅分页时需要）
      let total = 0;
      let totalPages = 0;
      
      if (isPaginated) {
        const countSql = `
          SELECT COUNT(*) as total
          FROM (
            SELECT DATE_ADD(${defaultStartDate}, INTERVAL seq DAY) AS date_col
            FROM (
              SELECT a.N + b.N * 10 AS seq
              FROM 
                (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 
                 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
                (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 
                 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
            ) seq_table
            WHERE DATE_ADD(${defaultStartDate}, INTERVAL seq DAY) <= ${defaultEndDate}
          ) date_series
        `;
        
        const [countRows] = await connection.execute(countSql);
        const dateCount = (countRows as any)[0]?.total || 0;
        total = dateCount * combos.length;
        totalPages = Math.ceil(total / validPageSize);
      }
      
      await connection.end();

      return isPaginated
        ? { data: rows, pagination: { page: validPage, limit: validPageSize, total, totalPages }, eventNames }
        : { data: rows, eventNames };

    } catch (error) {
      console.error('❌ [AppsFlyer-优化] 查询失败:', error);
      throw error;
    }
  },

  // 表格数据（分页）
  async getAppsflyerTableData(
    startDate?: string,
    endDate?: string,
    page: number = 1,
    pageSize: number = 10,
    appId?: string,
    mediaSource?: string,
    adSequence?: string,
    adPairs?: string,
    mediasWithoutAd?: string
  ) {
    return this.getAppsflyerData({
      startDate,
      endDate,
      page,
      pageSize,
      appId,
      mediaSource,
      adSequence,
      adPairs,
      mediasWithoutAd,
      isPaginated: true
    });
  },

  // 图表数据（不分页）
  async getAppsflyerChartData(
    startDate?: string,
    endDate?: string,
    appId?: string,
    mediaSource?: string,
    adSequence?: string,
    adPairs?: string,
    mediasWithoutAd?: string
  ) {
    return this.getAppsflyerData({
      startDate,
      endDate,
      appId,
      mediaSource,
      adSequence,
      adPairs,
      mediasWithoutAd,
      isPaginated: false
    });
  },

  // 🔧 辅助方法：解析筛选条件
  parseFilters(filters: {
    appId?: string;
    mediaSource?: string;
    adSequence?: string;
    adPairs?: string;
    mediasWithoutAd?: string;
  }) {
    const { appId, mediaSource, adSequence, adPairs, mediasWithoutAd } = filters;

    // 构建 app_id 筛选
    const appIdWhere = appId ? `AND (app_id = '${appId.replace(/'/g, "''")}' OR event_value_app_id = '${appId.replace(/'/g, "''")}')` : '';

    // 解析媒体渠道和广告序列
    const mediaValues = mediaSource
      ? mediaSource.split(',').map(s => s.trim()).filter(Boolean)
      : ['ALL'];
    const adValues = adSequence
      ? adSequence.split(',').map(s => s.trim()).filter(Boolean)
      : ['ALL'];

    // 解析配对（媒体+广告序列）
    const pairs: Array<{ media: string; ad: string }> = (adPairs || '')
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => {
        const [m, a] = p.split('|');
        return { media: (m || '').trim(), ad: (a || '').trim() };
      })
      .filter(pa => pa.media && pa.ad);

    // 解析仅媒体（不选广告序列）
    const mediasOnly = (mediasWithoutAd || '')
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);

    // 组合：精确配对 + 仅媒体（ad=ALL）
    const combos = [
      ...pairs.map(pa => ({ mediaVal: pa.media, adVal: pa.ad })),
      ...mediasOnly.map(m => ({ mediaVal: m, adVal: 'ALL' }))
    ];

    // 如果没有配对或仅媒体，使用笛卡尔积
    if (combos.length === 0) {
      combos.push(...mediaValues.flatMap(mediaVal => 
        adValues.map(adVal => ({ mediaVal, adVal }))
      ));
    }

    return {
      combos,
      whereClause: appIdWhere
    };
  }
};

