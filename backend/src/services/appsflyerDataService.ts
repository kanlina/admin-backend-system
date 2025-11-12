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

  // 获取所有 广告序列 (af_c_id)
  async getAllAdSequences(mediaSource?: string) {
    try {
      let sql = `
        SELECT DISTINCT af_c_id 
        FROM appsflyer_callback 
        WHERE af_c_id IS NOT NULL AND af_c_id != ''
      `;
      if (mediaSource && mediaSource.trim()) {
        const sources = mediaSource.split(',').map(s => s.trim()).filter(Boolean).map(s => `'${s.replace(/'/g, "''")}'`).join(',');
        sql += ` AND media_source IN (${sources})`;
      }
      sql += ` ORDER BY af_c_id ASC`;

      const connection = await createCoreDbConnection();
      const [rows] = await connection.execute(sql);
      await connection.end();

      return (rows as any[]).map(row => row.af_c_id);
    } catch (error) {
      console.error('获取 af_c_id 列表失败:', error);
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
    mediaSource?: string,
    adSequence?: string,
    granularity: 'day' | 'hour' = 'day',
    adPairs?: string,
    mediasWithoutAd?: string,
    reloanStatus?: string
  ) {
    const validPage = Math.max(1, parseInt(page.toString()));
    const validPageSize = Math.min(Math.max(1, parseInt(pageSize.toString())), 100);
    
    // 处理日期参数，如果是具体日期则加引号，如果是SQL函数则不加
    const defaultStartDate = startDate ? `'${startDate}'` : 'DATE_SUB(CURDATE(), INTERVAL 10 DAY)';
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

      // 解析媒体渠道与广告序列（均支持多选，允许为空代表 ALL）
      const mediaValues = mediaSource 
        ? mediaSource.split(',').map(s => s.trim()).filter(s => s)
        : ['ALL'];
      const adValues = adSequence 
        ? adSequence.split(',').map(s => s.trim()).filter(s => s)
        : ['ALL'];

      // 构建app_id筛选条件
      const sanitizedAppId = appId ? appId.replace(/'/g, "''") : undefined;
      const appIdWhere = sanitizedAppId ? `AND (app_id = '${sanitizedAppId}' OR event_value_app_id = '${sanitizedAppId}')` : '';

      // 解析配对（媒体+广告序列）
      const pairs: Array<{ media: string; ad: string } > = (adPairs || '')
        .split(',')
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => {
          const [m, a] = p.split('|');
          return { media: (m || '').trim(), ad: (a || '').trim() };
        })
        .filter(pa => pa.media && pa.ad);

      // 解析仅媒体（不选广告序列，查全部）
      const mediasOnly = (mediasWithoutAd || '')
        .split(',')
        .map(m => m.trim())
        .filter(Boolean);

      const sanitizedReloan = typeof reloanStatus === 'string' && reloanStatus.trim() !== '' ? reloanStatus.trim() : undefined;
      const reloanJoin = sanitizedReloan !== undefined
        ? `INNER JOIN user_collision_record ucr ON ucr.user_id = ac.customer_user_id AND ucr.is_reloan = ${Number(sanitizedReloan)}`
        : '';

      let comboIndex = 0;
      // 组合：精确配对 + 仅媒体（ad=ALL）
      const combos = [
        ...pairs.map(pa => ({ mediaVal: pa.media, adVal: pa.ad })),
        ...mediasOnly.map(m => ({ mediaVal: m, adVal: 'ALL' }))
      ];
      
      // 如果没有任何配对或仅媒体，则使用笛卡尔
      if (combos.length === 0) {
        combos.push(...mediaValues.flatMap(mediaVal => adValues.map(adVal => ({ mediaVal, adVal }))));
      }

      const perDimensionQueries = combos.map(({ mediaVal, adVal }) => {
        const escapedMedia = mediaVal.replace(/'/g, "''");
        const escapedAd = adVal.replace(/'/g, "''");
        const whereByMedia = mediaVal !== 'ALL' ? `AND media_source = '${escapedMedia}'` : '';
        const whereByAd = adVal !== 'ALL' ? `AND af_c_id = '${escapedAd}'` : '';
        const index = comboIndex++;
        
        const eventAggregations = eventNames.map((eventName) => {
          const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
          const escapedEventName = eventName.replace(/'/g, "''");
          const isInstallEvent = eventName.trim().toLowerCase() === 'install';
          const distinctField = isInstallEvent ? 'ac.appsflyer_id' : 'ac.customer_user_id';
          const additionalConditions = !isInstallEvent ? ' AND ac.customer_user_id IS NOT NULL' : '';
          return `COUNT(DISTINCT CASE WHEN COALESCE(ac.event_name, JSON_UNQUOTE(JSON_EXTRACT(ac.raw_data, '$.event_name'))) = '${escapedEventName}'${additionalConditions} THEN ${distinctField} END) AS event_${sanitizedName}`;
        }).join(',\n            ');

        const aggregatedSubquery = `
          SELECT 
            DATE(ac.created_at) AS date_col
            ${eventAggregations ? ',\n            ' + eventAggregations : ''}
          FROM appsflyer_callback ac
          ${reloanJoin}
          WHERE ac.callback_status = 'processed'
            ${appIdWhere}
            ${whereByMedia}
            ${whereByAd}
          GROUP BY DATE(ac.created_at)
        `;

        const outerSelectColumns = eventNames.map((eventName) => {
          const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
          return `COALESCE(agg_${index}.event_${sanitizedName}, 0) AS event_${sanitizedName}`;
        }).join(',\n            ');

        return `
          SELECT 
            DATE_FORMAT(date_series.date_col, '%Y-%m-%d') AS query_date,
            '${escapedMedia}' AS media_source,
            '${escapedAd}' AS ad_sequence
            ${outerSelectColumns ? ',\n            ' + outerSelectColumns : ''}
          FROM (
              SELECT DATE_ADD(${defaultStartDate}, INTERVAL (a.a + (10 * b.a)) DAY) AS date_col
              FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
              CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
              WHERE DATE_ADD(${defaultStartDate}, INTERVAL (a.a + (10 * b.a)) DAY) <= ${defaultEndDate}
          ) AS date_series
          LEFT JOIN (${aggregatedSubquery}) agg_${index} ON agg_${index}.date_col = date_series.date_col
          WHERE date_series.date_col IS NOT NULL
        `;
      });

      // 使用UNION ALL合并所有组合的查询
      const sql = `
        SELECT * FROM (
          ${perDimensionQueries.join('\n          UNION ALL\n')}
        ) AS combined_data
        ORDER BY query_date DESC, media_source ASC, ad_sequence ASC
        LIMIT ${validPageSize} OFFSET ${(validPage - 1) * validPageSize}
      `;

      console.log('🔍 [AppsFlyer] 执行数据查询');
      console.log('事件数量:', eventNames.length);
      console.log('日期范围:', defaultStartDate, '到', defaultEndDate);
      console.log('筛选条件:', { appId, mediaSource, adSequence });
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

      // 获取总数：日期数量 × 媒体渠道数量
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

      const dateCount = (countRows as any)[0]?.total || 0;
      const total = dateCount * mediaValues.length * adValues.length; // 总数 = 日期数 × 组合数
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
    mediaSource?: string,
    adSequence?: string,
    granularity: 'day' | 'hour' = 'day',
    adPairs?: string,
    mediasWithoutAd?: string,
    reloanStatus?: string
  ) {
    // 处理日期参数，如果是具体日期则加引号，如果是SQL函数则不加
    const defaultStartDate = startDate ? `'${startDate}'` : 'DATE_SUB(CURDATE(), INTERVAL 10 DAY)';
    const defaultEndDate = endDate ? `'${endDate}'` : 'CURDATE()';
    
    try {
      const eventNames = await this.getAllEventNames();
      
      if (eventNames.length === 0) {
        return { data: [], eventNames: [] };
      }

      const mediaValues = mediaSource 
        ? mediaSource.split(',').map(s => s.trim()).filter(s => s)
        : ['ALL'];
      const adValues = adSequence 
        ? adSequence.split(',').map(s => s.trim()).filter(s => s)
        : ['ALL'];
      
      // 解析配对（媒体+广告序列）
      const pairs: Array<{ media: string; ad: string } > = (adPairs || '')
        .split(',')
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => {
          const [m, a] = p.split('|');
          return { media: (m || '').trim(), ad: (a || '').trim() };
        })
        .filter(pa => pa.media && pa.ad);

      // 解析仅媒体（不选广告序列，查全部）
      const mediasOnly = (mediasWithoutAd || '')
        .split(',')
        .map(m => m.trim())
        .filter(Boolean);

      // 构建app_id筛选条件
      const sanitizedAppId = appId ? appId.replace(/'/g, "''") : undefined;
      const appIdWhere = sanitizedAppId ? `AND (app_id = '${sanitizedAppId}' OR event_value_app_id = '${sanitizedAppId}')` : '';

      const sanitizedReloan = typeof reloanStatus === 'string' && reloanStatus.trim() !== '' ? reloanStatus.trim() : undefined;

      let comboIndex = 0;
      // 组合：精确配对 + 仅媒体（ad=ALL）
      const combos = [
        ...pairs.map(pa => ({ mediaVal: pa.media, adVal: pa.ad })),
        ...mediasOnly.map(m => ({ mediaVal: m, adVal: 'ALL' }))
      ];
      
      // 如果没有任何配对或仅媒体，则使用笛卡尔
      if (combos.length === 0) {
        combos.push(...mediaValues.flatMap(mediaVal => adValues.map(adVal => ({ mediaVal, adVal }))));
      }

      const perDimensionQueries = combos.map(({ mediaVal, adVal }) => {
        const escapedMedia = mediaVal.replace(/'/g, "''");
        const escapedAd = adVal.replace(/'/g, "''");
        const whereByMedia = mediaVal !== 'ALL' ? `AND media_source = '${escapedMedia}'` : '';
        const whereByAd = adVal !== 'ALL' ? `AND af_c_id = '${escapedAd}'` : '';
        const index = comboIndex++;
        
        // 为每个事件类型构建统计子查询
        const eventStatsJoins = eventNames.map((eventName) => {
          const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
          const escapedEventName = eventName.replace(/'/g, "''");
          const isInstallEvent = eventName.trim().toLowerCase() === 'install';
          const distinctField = isInstallEvent ? 'ac.appsflyer_id' : 'ac.customer_user_id';
          
          return `
          LEFT JOIN (
              SELECT 
                  DATE(ac.created_at) AS date_col,
                  COUNT(DISTINCT ${distinctField}) AS count_${sanitizedName}
              FROM appsflyer_callback ac
              ${sanitizedReloan !== undefined ? `INNER JOIN user_collision_record ucr_${index}_${sanitizedName} ON ucr_${index}_${sanitizedName}.user_id = ac.customer_user_id AND ucr_${index}_${sanitizedName}.is_reloan = ${Number(sanitizedReloan)}` : ''}
              WHERE COALESCE(ac.event_name, JSON_UNQUOTE(JSON_EXTRACT(ac.raw_data, '$.event_name'))) = '${escapedEventName}' 
                AND ac.callback_status = 'processed'
                AND ac.customer_user_id IS NOT NULL
                ${appIdWhere}
                ${whereByMedia}
                ${whereByAd}
              GROUP BY DATE(ac.created_at)
          ) stats_${sanitizedName}_${index} ON stats_${sanitizedName}_${index}.date_col = date_series.date_col`;
        }).join('\n');

        const selectColumns = eventNames.map((eventName) => {
          const sanitizedName = eventName.replace(/[^a-zA-Z0-9_]/g, '_');
          return `COALESCE(stats_${sanitizedName}_${index}.count_${sanitizedName}, 0) AS event_${sanitizedName}`;
        }).join(',\n            ');

        return `
          SELECT 
            DATE_FORMAT(date_series.date_col, '%Y-%m-%d') AS query_date,
            '${escapedMedia}' AS media_source,
            '${escapedAd}' AS ad_sequence
            ${selectColumns ? ',' + selectColumns : ''}
          FROM (
              SELECT DATE_ADD(${defaultStartDate}, INTERVAL (a.a + (10 * b.a)) DAY) AS date_col
              FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
              CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
              WHERE DATE_ADD(${defaultStartDate}, INTERVAL (a.a + (10 * b.a)) DAY) <= ${defaultEndDate}
          ) AS date_series
          ${eventStatsJoins}
          WHERE date_series.date_col IS NOT NULL
        `;
      });

      // 使用UNION ALL合并所有组合的查询
      const sql = `
        SELECT * FROM (
          ${perDimensionQueries.join('\n          UNION ALL\n')}
        ) AS combined_data
        ORDER BY query_date ASC, media_source ASC, ad_sequence ASC
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
  },

  async getAppsflyerDetails(
    date: string,
    page: number = 1,
    pageSize: number = 10,
    appId?: string,
    mediaSource?: string,
    adSequence?: string,
    reloanStatus?: string
  ) {
    if (!date) {
      return {
        data: [],
        pagination: { page: 1, limit: pageSize, total: 0, totalPages: 0 },
      };
    }

    const validPage = Math.max(1, parseInt(page.toString()));
    const validPageSize = Math.min(Math.max(1, parseInt(pageSize.toString())), 100);
    const offset = (validPage - 1) * validPageSize;

    const sanitizedDate = date.replace(/'/g, "''");
    const sanitizedAppId = appId ? appId.replace(/'/g, "''") : undefined;
    const sanitizedMedia = mediaSource && mediaSource !== 'ALL' ? mediaSource.replace(/'/g, "''") : undefined;
    const sanitizedAd = adSequence && adSequence !== 'ALL' ? adSequence.replace(/'/g, "''") : undefined;
    const sanitizedReloan = typeof reloanStatus === 'string' && reloanStatus.trim() !== '' ? reloanStatus.trim() : undefined;

    const filters: string[] = [
      `ac.callback_status = 'processed'`,
      `DATE(ac.created_at) = '${sanitizedDate}'`,
      `ac.customer_user_id IS NOT NULL`,
    ];

    if (sanitizedAppId) {
      filters.push(`(ac.app_id = '${sanitizedAppId}' OR ac.event_value_app_id = '${sanitizedAppId}')`);
    }
    if (sanitizedMedia) {
      filters.push(`ac.media_source = '${sanitizedMedia}'`);
    }
    if (sanitizedAd) {
      filters.push(`ac.af_c_id = '${sanitizedAd}'`);
    }

    const reloanJoin = sanitizedReloan !== undefined
      ? `INNER JOIN user_collision_record ucr ON ucr.user_id = ac.customer_user_id AND ucr.is_reloan = ${Number(sanitizedReloan)}`
      : '';

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const sql = `
      SELECT 
        ac.id,
        ac.customer_user_id,
        COALESCE(ac.event_name, JSON_UNQUOTE(JSON_EXTRACT(ac.raw_data, '$.event_name'))) AS event_name,
        DATE_FORMAT(ac.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        ac.media_source,
        ac.af_c_id AS ad_sequence,
        ac.app_id,
        ac.event_value_app_id,
        ac.event_value
      FROM appsflyer_callback ac
      ${reloanJoin}
      ${whereClause}
      ORDER BY ac.created_at DESC
      LIMIT ${validPageSize} OFFSET ${offset}
    `;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM appsflyer_callback ac
      ${reloanJoin}
      ${whereClause}
    `;

    const connection = await createCoreDbConnection();
    const [rows] = await connection.execute(sql);
    const [countRows] = await connection.execute(countSql);
    await connection.end();

    const total = (countRows as any)[0]?.total || 0;
    const totalPages = Math.ceil(total / validPageSize);

    return {
      data: rows,
      pagination: {
        page: validPage,
        limit: validPageSize,
        total,
        totalPages,
      },
    };
  }
};

