import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { createMainDbConnection } from '../utils/database';
import { PushConfig, PushConfigInput, PushPlatform } from '../types/pushConfig';

const TABLE_NAME = 'push_configs';

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    appId VARCHAR(255) NOT NULL,
    platform ENUM('android','ios','web','all') NOT NULL DEFAULT 'all',
    projectId VARCHAR(255) NOT NULL,
    serverKey TEXT NULL,
    serviceAccount TEXT NULL,
    vapidKey TEXT NULL,
    description TEXT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_app_platform (appId, platform),
    KEY idx_appId (appId),
    KEY idx_platform (platform),
    KEY idx_enabled (enabled),
    KEY idx_updatedAt (updatedAt)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const ensureTableReady = (async () => {
  const connection = await createMainDbConnection();
  try {
    await connection.execute(CREATE_TABLE_SQL);
  } catch (error) {
    console.error('[pushConfigService] 初始化数据表失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
})();

const mapRowToPushConfig = (row: RowDataPacket): PushConfig => ({
  id: row.id,
  name: row.name,
  appId: row.appId,
  platform: row.platform as PushPlatform,
  projectId: row.projectId,
  serverKey: row.serverKey,
  serviceAccount: row.serviceAccount,
  vapidKey: row.vapidKey,
  description: row.description,
  enabled: row.enabled === 1 || row.enabled === true,
  createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
});

export const pushConfigService = {
  async getPushConfigs(filters?: { appId?: string; platform?: PushPlatform; enabled?: boolean }) {
    await ensureTableReady;
    const connection = await createMainDbConnection();
    try {
      let query = `SELECT * FROM ${TABLE_NAME} WHERE 1=1`;
      const params: Array<string | number> = [];

      if (filters?.appId) {
        query += ' AND appId = ?';
        params.push(filters.appId);
      }
      if (filters?.platform) {
        query += ' AND platform = ?';
        params.push(filters.platform);
      }
      if (typeof filters?.enabled === 'boolean') {
        query += ' AND enabled = ?';
        params.push(filters.enabled ? 1 : 0);
      }

      query += ' ORDER BY updatedAt DESC';

      const [rows] = await connection.execute<RowDataPacket[]>(query, params);
      return rows.map(mapRowToPushConfig);
    } finally {
      await connection.end();
    }
  },

  async getPushConfigById(id: number) {
    await ensureTableReady;
    const connection = await createMainDbConnection();
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM ${TABLE_NAME} WHERE id = ?`,
        [id]
      );
      if (rows.length === 0) {
        return null;
      }
      return mapRowToPushConfig(rows[0]);
    } finally {
      await connection.end();
    }
  },

  async createPushConfig(payload: PushConfigInput) {
    await ensureTableReady;
    const connection = await createMainDbConnection();
    try {
      const enabled = payload.enabled ?? true;
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO ${TABLE_NAME} 
          (name, appId, platform, projectId, serverKey, serviceAccount, vapidKey, description, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.name,
          payload.appId,
          payload.platform,
          payload.projectId,
          payload.serverKey || null,
          payload.serviceAccount || null,
          payload.vapidKey || null,
          payload.description || null,
          enabled ? 1 : 0,
        ]
      );

      return await this.getPushConfigById(result.insertId);
    } finally {
      await connection.end();
    }
  },

  async updatePushConfig(id: number, payload: Partial<PushConfigInput>) {
    await ensureTableReady;
    const connection = await createMainDbConnection();
    try {
      const fields: string[] = [];
      const params: Array<string | number> = [];

      (['name', 'appId', 'platform', 'projectId', 'serverKey', 'serviceAccount', 'vapidKey', 'description'] as const)
        .forEach((field) => {
          if (payload[field] !== undefined) {
            fields.push(`${field} = ?`);
            params.push(payload[field] as string);
          }
        });

      if (payload.enabled !== undefined) {
        fields.push('enabled = ?');
        params.push(payload.enabled ? 1 : 0);
      }

      if (fields.length === 0) {
        return await this.getPushConfigById(id);
      }

      params.push(id);
      await connection.execute(
        `UPDATE ${TABLE_NAME} SET ${fields.join(', ')} WHERE id = ?`,
        params
      );

      return await this.getPushConfigById(id);
    } finally {
      await connection.end();
    }
  },

  async deletePushConfig(id: number) {
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

