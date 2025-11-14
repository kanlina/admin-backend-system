import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { createMainDbConnection } from '../utils/database';
import { PushTask, PushTaskInput, PushTaskStatus } from '../types/pushTask';

const TABLE_NAME = 'push_tasks';

const mapRowToTask = (row: RowDataPacket): PushTask => ({
  id: row.id,
  name: row.name,
  description: row.description || undefined,
  pushConfigId: row.pushConfigId,
  pushTemplateId: row.pushTemplateId,
  pushAudienceId: row.pushAudienceId,
  createdBy: row.createdBy,
  status: row.status,
  scheduleTime: row.scheduleTime instanceof Date ? row.scheduleTime.toISOString() : row.scheduleTime || undefined,
  totalTokens: row.totalTokens ?? undefined,
  successCount: row.successCount ?? undefined,
  failureCount: row.failureCount ?? undefined,
  lastError: row.lastError || undefined,
  createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  pushConfigName: row.pushConfigName,
  pushTemplateName: row.pushTemplateName,
  pushAudienceName: row.pushAudienceName,
  createdByName: row.createdByName,
});

export const pushTaskService = {
  async getTasks(filters?: { status?: PushTaskStatus; search?: string }) {
    const connection = await createMainDbConnection();
    try {
      let query = `
        SELECT t.*, pc.name AS pushConfigName, pt.name AS pushTemplateName, pa.name AS pushAudienceName, u.username AS createdByName
        FROM ${TABLE_NAME} t
        LEFT JOIN push_configs pc ON pc.id = t.pushConfigId
        LEFT JOIN push_templates pt ON pt.id = t.pushTemplateId
        LEFT JOIN push_audiences pa ON pa.id = t.pushAudienceId
        LEFT JOIN users u ON u.id = t.createdBy
        WHERE 1=1
      `;
      const params: Array<string | number> = [];

      if (filters?.status) {
        query += ' AND t.status = ?';
        params.push(filters.status);
      }

      if (filters?.search) {
        query += ' AND (t.name LIKE ? OR pc.name LIKE ? OR pa.name LIKE ? OR u.username LIKE ?)';
        const keyword = `%${filters.search}%`;
        params.push(keyword, keyword, keyword, keyword);
      }

      query += ' ORDER BY t.updatedAt DESC';

      const [rows] = await connection.execute<RowDataPacket[]>(query, params);
      return rows.map(mapRowToTask);
    } finally {
      await connection.end();
    }
  },

  async getTaskById(id: number) {
    const connection = await createMainDbConnection();
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `
          SELECT t.*, pc.name AS pushConfigName, pt.name AS pushTemplateName, pa.name AS pushAudienceName, u.username AS createdByName
          FROM ${TABLE_NAME} t
          LEFT JOIN push_configs pc ON pc.id = t.pushConfigId
          LEFT JOIN push_templates pt ON pt.id = t.pushTemplateId
          LEFT JOIN push_audiences pa ON pa.id = t.pushAudienceId
          LEFT JOIN users u ON u.id = t.createdBy
          WHERE t.id = ?
        `,
        [id]
      );
      if (!rows.length) {
        return null;
      }
      return mapRowToTask(rows[0]);
    } finally {
      await connection.end();
    }
  },

  async createTask(payload: PushTaskInput) {
    const connection = await createMainDbConnection();
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO ${TABLE_NAME}
          (name, description, pushConfigId, pushTemplateId, pushAudienceId, createdBy, status, scheduleTime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.name,
          payload.description || null,
          payload.pushConfigId,
          payload.pushTemplateId,
          payload.pushAudienceId,
          payload.createdBy,
          payload.status || 'draft',
          payload.scheduleTime || null,
        ]
      );

      return await this.getTaskById(result.insertId);
    } finally {
      await connection.end();
    }
  },

  async updateTask(id: number, payload: Partial<PushTaskInput>) {
    const connection = await createMainDbConnection();
    try {
      const fields: string[] = [];
      const params: Array<string | number | null> = [];

      (['name', 'description', 'pushConfigId', 'pushTemplateId', 'pushAudienceId', 'status'] as const).forEach(
        (field) => {
          if (payload[field] !== undefined) {
            fields.push(`${field} = ?`);
            params.push(payload[field] as string | number | null);
          }
        }
      );

      if (payload.createdBy !== undefined) {
        fields.push('createdBy = ?');
        params.push(payload.createdBy);
      }

      if (payload.scheduleTime !== undefined) {
        fields.push('scheduleTime = ?');
        params.push(payload.scheduleTime || null);
      }

      if (!fields.length) {
        return await this.getTaskById(id);
      }

      params.push(id);
      await connection.execute(`UPDATE ${TABLE_NAME} SET ${fields.join(', ')} WHERE id = ?`, params);
      return await this.getTaskById(id);
    } finally {
      await connection.end();
    }
  },

  async updateTaskStats(
    id: number,
    stats: { status?: PushTaskStatus; totalTokens?: number; successCount?: number; failureCount?: number; lastError?: string | null }
  ) {
    const connection = await createMainDbConnection();
    try {
      const fields: string[] = [];
      const params: Array<string | number | null> = [];

      Object.entries(stats).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          params.push(value as any);
        }
      });

      if (!fields.length) {
        return await this.getTaskById(id);
      }

      params.push(id);
      await connection.execute(`UPDATE ${TABLE_NAME} SET ${fields.join(', ')} WHERE id = ?`, params);
      return await this.getTaskById(id);
    } finally {
      await connection.end();
    }
  },

  async deleteTask(id: number) {
    const connection = await createMainDbConnection();
    try {
      await connection.execute(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);
      return true;
    } finally {
      await connection.end();
    }
  },
};

