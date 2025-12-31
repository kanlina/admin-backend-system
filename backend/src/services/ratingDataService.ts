import { createCoreDbConnection } from '../utils/database';

export interface RatingDataRow {
  query_date: string; // YYYY-MM-DD
  rating_level: number;
  user_count: number;
}

class RatingDataService {
  /**
   * /rating-data
   * 按日期 + rating_level 聚合
   */
  async getRatingData(startDate?: string, endDate?: string): Promise<RatingDataRow[]> {
    const connection = await createCoreDbConnection();

    try {
      const conditions: string[] = [];
      const params: any[] = [];

      // 兼容前端不传日期：默认不过滤
      if (startDate) {
        conditions.push('DATE(created_at) >= ?');
        params.push(startDate);
      }
      if (endDate) {
        conditions.push('DATE(created_at) <= ?');
        params.push(endDate);
      }

      const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      // 表：user_rating(id, user_id, rating_level, created_at, updated_at)
      const sql = `
        SELECT
          DATE_FORMAT(created_at, '%Y-%m-%d') AS query_date,
          rating_level,
          COUNT(DISTINCT user_id) AS user_count
        FROM user_rating
        ${whereSql}
        GROUP BY DATE(created_at), rating_level
        ORDER BY DATE(created_at) DESC, rating_level ASC
      `;

      const [rows] = await connection.execute(sql, params);

      return (rows as any[]).map((r) => ({
        query_date: r.query_date,
        rating_level: Number(r.rating_level),
        user_count: Number(r.user_count || 0),
      }));
    } finally {
      await connection.end();
    }
  }
}

export const ratingDataService = new RatingDataService();

