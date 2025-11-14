import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { createMainDbConnection } from '../utils/database';
import { PushTemplate, PushTemplateInput } from '../types/pushTemplate';

const TABLE_NAME = 'push_templates';

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    templateKey VARCHAR(255) NOT NULL,
    pushConfigId INT UNSIGNED NOT NULL,
    pushAudienceId INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    dataPayload TEXT NULL,
    clickAction VARCHAR(512) NULL,
    imageUrl VARCHAR(512) NULL,
    description TEXT NULL,
    tags TEXT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_template (templateKey, pushConfigId),
    KEY idx_templateKey (templateKey),
    KEY idx_pushConfigId (pushConfigId),
    KEY idx_pushAudienceId (pushAudienceId),
    KEY idx_enabled (enabled),
    KEY idx_updatedAt (updatedAt)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const ensureTableReady = (async () => {
  const connection = await createMainDbConnection();
  try {
    await connection.execute(CREATE_TABLE_SQL);
  } catch (error) {
    console.error('[pushTemplateService] 初始化数据表失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
})();

const parseJsonField = <T>(value?: string | null): T | undefined => {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
};

const stringifyField = (value?: any) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (Array.isArray(value) && value.length === 0) {
    return null;
  }
  if (typeof value === 'object' && Object.keys(value).length === 0) {
    return null;
  }
  return JSON.stringify(value);
};

const generateTemplateKey = () => {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const mapRowToTemplate = (row: RowDataPacket): PushTemplate => ({
  id: row.id,
  name: row.name,
  templateKey: row.templateKey,
  pushConfigId: row.pushConfigId,
  pushAudienceId: row.pushAudienceId,
  pushConfigName: row.pushConfigName || row.configName,
  pushAudienceName: row.pushAudienceName || row.audienceName,
  title: row.title,
  body: row.body,
  dataPayload: parseJsonField<Record<string, any>>(row.dataPayload),
  clickAction: row.clickAction || undefined,
  imageUrl: row.imageUrl || undefined,
  description: row.description || undefined,
  tags: parseJsonField<string[]>(row.tags) || [],
  enabled: row.enabled === 1 || row.enabled === true,
  createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
});

export const pushTemplateService = {
  async getTemplates(filters?: {
    search?: string;
    pushConfigId?: number;
    pushAudienceId?: number;
    enabled?: boolean;
  }) {
    await ensureTableReady;
    const connection = await createMainDbConnection();
    try {
      let query = `
        SELECT t.*, pc.name AS pushConfigName, pa.name AS pushAudienceName
        FROM ${TABLE_NAME} t
        LEFT JOIN push_configs pc ON pc.id = t.pushConfigId
        LEFT JOIN push_audiences pa ON pa.id = t.pushAudienceId
        WHERE 1=1
      `;
      const params: Array<string | number> = [];

      if (filters?.search) {
        query += ' AND (t.name LIKE ? OR t.templateKey LIKE ? OR t.title LIKE ?)';
        const keyword = `%${filters.search}%`;
        params.push(keyword, keyword, keyword);
      }
      if (filters?.pushConfigId) {
        query += ' AND t.pushConfigId = ?';
        params.push(filters.pushConfigId);
      }
      if (filters?.pushAudienceId) {
        query += ' AND t.pushAudienceId = ?';
        params.push(filters.pushAudienceId);
      }
      if (typeof filters?.enabled === 'boolean') {
        query += ' AND t.enabled = ?';
        params.push(filters.enabled ? 1 : 0);
      }

      query += ' ORDER BY t.updatedAt DESC';

      const [rows] = await connection.execute<RowDataPacket[]>(query, params);
      return rows.map(mapRowToTemplate);
    } finally {
      await connection.end();
    }
  },

  async getTemplateById(id: number) {
    await ensureTableReady;
    const connection = await createMainDbConnection();
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `
          SELECT t.*, pc.name AS pushConfigName, pa.name AS pushAudienceName
          FROM ${TABLE_NAME} t
          LEFT JOIN push_configs pc ON pc.id = t.pushConfigId
          LEFT JOIN push_audiences pa ON pa.id = t.pushAudienceId
          WHERE t.id = ?
        `,
        [id]
      );
      if (rows.length === 0) {
        return null;
      }
      return mapRowToTemplate(rows[0]);
    } finally {
      await connection.end();
    }
  },

  async createTemplate(payload: PushTemplateInput) {
    await ensureTableReady;
    const connection = await createMainDbConnection();
    try {
      const enabled = payload.enabled ?? true;
      const templateKey =
        (typeof payload.templateKey === 'string' && payload.templateKey.trim()) || generateTemplateKey();
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO ${TABLE_NAME}
          (name, templateKey, pushConfigId, pushAudienceId, title, body, dataPayload, clickAction, imageUrl, description, tags, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.name,
          templateKey,
          payload.pushConfigId,
          payload.pushAudienceId,
          payload.title,
          payload.body,
          stringifyField(payload.dataPayload),
          payload.clickAction || null,
          payload.imageUrl || null,
          payload.description || null,
          stringifyField(payload.tags),
          enabled ? 1 : 0,
        ]
      );

      return await this.getTemplateById(result.insertId);
    } finally {
      await connection.end();
    }
  },

  async updateTemplate(id: number, payload: Partial<PushTemplateInput>) {
    await ensureTableReady;
    const connection = await createMainDbConnection();
    try {
      const fields: string[] = [];
      const params: Array<string | number | null> = [];

      (['name', 'templateKey', 'title', 'body', 'clickAction', 'imageUrl', 'description'] as const)
        .forEach((field) => {
          if (payload[field] !== undefined) {
            fields.push(`${field} = ?`);
            params.push(payload[field] as string);
          }
        });

      if (payload.pushConfigId !== undefined) {
        fields.push('pushConfigId = ?');
        params.push(payload.pushConfigId);
      }

      if (payload.pushAudienceId !== undefined) {
        fields.push('pushAudienceId = ?');
        params.push(payload.pushAudienceId);
      }

      if (payload.dataPayload !== undefined) {
        fields.push('dataPayload = ?');
        params.push(stringifyField(payload.dataPayload));
      }

      if (payload.tags !== undefined) {
        fields.push('tags = ?');
        params.push(stringifyField(payload.tags));
      }

      if (payload.enabled !== undefined) {
        fields.push('enabled = ?');
        params.push(payload.enabled ? 1 : 0);
      }

      if (fields.length === 0) {
        return await this.getTemplateById(id);
      }

      params.push(id);
      await connection.execute(
        `UPDATE ${TABLE_NAME} SET ${fields.join(', ')} WHERE id = ?`,
        params
      );

      return await this.getTemplateById(id);
    } finally {
      await connection.end();
    }
  },

  async deleteTemplate(id: number) {
    await ensureTableReady;
    const connection = await createMainDbConnection();
    try {
      await connection.execute(
        `DELETE FROM ${TABLE_NAME} WHERE id = ?`,
        [id]
      );
      return true;
    } finally {
      await connection.end();
    }
  },
};

