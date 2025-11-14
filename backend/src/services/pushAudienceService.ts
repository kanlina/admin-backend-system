import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { createMainDbConnection } from '../utils/database';
import {
  PushAudience,
  PushAudienceInput,
  PushToken,
  PushTokenImportPayload,
  PushTokenInput,
} from '../types/pushAudience';

const AUDIENCE_TABLE = 'push_audiences';
const TOKEN_TABLE = 'push_tokens';
const REL_TABLE = 'push_audience_tokens';

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
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return null;
  }
  return JSON.stringify(value);
};

const mapAudience = (row: RowDataPacket): PushAudience => ({
  id: row.id,
  name: row.name,
  description: row.description || undefined,
  tags: parseJsonField<string[]>(row.tags) || [],
  status: row.status,
  createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
});

const mapToken = (row: RowDataPacket): PushToken => {
  const audienceIds = row.audienceIds
    ? String(row.audienceIds)
        .split(',')
        .map((id: string) => Number(id))
        .filter((id: number) => !Number.isNaN(id))
    : [];

  return {
    id: row.id,
    token: row.token,
    tags: parseJsonField<string[]>(row.tags) || [],
    status: row.status || 'active',
    lastActiveAt:
      row.lastActiveAt instanceof Date ? row.lastActiveAt.toISOString() : row.lastActiveAt || undefined,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    audienceIds,
  };
};

const attachTokenToAudiences = async (
  connection: Awaited<ReturnType<typeof createMainDbConnection>>,
  tokenId: number,
  audienceIds?: number[],
  replaceExisting = false
) => {
  if (!audienceIds || audienceIds.length === 0) {
    return;
  }

  if (replaceExisting) {
    await connection.execute(`DELETE FROM ${REL_TABLE} WHERE tokenId = ?`, [tokenId]);
  }

  const uniqueAudienceIds = Array.from(new Set(audienceIds));
  for (const audienceId of uniqueAudienceIds) {
    await connection.execute(
      `INSERT IGNORE INTO ${REL_TABLE} (audienceId, tokenId) VALUES (?, ?)`,
      [audienceId, tokenId]
    );
  }
};

export const pushAudienceService = {
  async getAudiences(): Promise<PushAudience[]> {
    const connection = await createMainDbConnection();
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM ${AUDIENCE_TABLE} ORDER BY updatedAt DESC`
      );
      return rows.map(mapAudience);
    } finally {
      await connection.end();
    }
  },

  async createAudience(payload: PushAudienceInput): Promise<PushAudience> {
    const connection = await createMainDbConnection();
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO ${AUDIENCE_TABLE}
          (name, description, tags, status)
         VALUES (?, ?, ?, ?)`,
        [
          payload.name,
          payload.description || null,
          stringifyField(payload.tags),
          payload.status || 'active',
        ]
      );

      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM ${AUDIENCE_TABLE} WHERE id = ?`,
        [result.insertId]
      );
      return mapAudience(rows[0]);
    } finally {
      await connection.end();
    }
  },

  async updateAudience(id: number, payload: PushAudienceInput): Promise<PushAudience | null> {
    const connection = await createMainDbConnection();
    try {
      const fields: string[] = [];
      const params: Array<string | number | null> = [];

      const updatableFields: Array<keyof PushAudienceInput> = [
        'name',
        'description',
        'tags',
        'status',
      ];

      updatableFields.forEach((field) => {
        if (payload[field] !== undefined) {
          if (field === 'tags') {
            fields.push(`${field} = ?`);
            params.push(stringifyField(payload[field]));
          } else {
            fields.push(`${field} = ?`);
            params.push(payload[field] as string | number | null);
          }
        }
      });

      if (fields.length === 0) {
        return null;
      }

      params.push(id);
      await connection.execute(
        `UPDATE ${AUDIENCE_TABLE} SET ${fields.join(', ')} WHERE id = ?`,
        params
      );

      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM ${AUDIENCE_TABLE} WHERE id = ?`,
        [id]
      );
      if (rows.length === 0) {
        return null;
      }
      return mapAudience(rows[0]);
    } finally {
      await connection.end();
    }
  },

  async deleteAudience(id: number): Promise<boolean> {
    const connection = await createMainDbConnection();
    try {
      await connection.execute(`DELETE FROM ${REL_TABLE} WHERE audienceId = ?`, [id]);
      await connection.execute(`DELETE FROM ${AUDIENCE_TABLE} WHERE id = ?`, [id]);
      return true;
    } finally {
      await connection.end();
    }
  },

  async getTokens(filters?: {
    search?: string;
    status?: string;
    audienceId?: number;
  }): Promise<PushToken[]> {
    const connection = await createMainDbConnection();
    try {
      let query = `
        SELECT t.*, GROUP_CONCAT(DISTINCT at.audienceId) AS audienceIds
        FROM ${TOKEN_TABLE} t
        LEFT JOIN ${REL_TABLE} at ON at.tokenId = t.id
        WHERE 1=1
      `;
      const params: Array<string | number> = [];

      if (filters?.search) {
        query += ' AND t.token LIKE ?';
        const keyword = `%${filters.search}%`;
        params.push(keyword);
      }
      if (filters?.status) {
        query += ' AND t.status = ?';
        params.push(filters.status);
      }
      if (filters?.audienceId) {
        query += ' AND at.audienceId = ?';
        params.push(filters.audienceId);
      }

      query += ' GROUP BY t.id ORDER BY t.updatedAt DESC';

      const [rows] = await connection.execute<RowDataPacket[]>(query, params);
      return rows.map(mapToken);
    } finally {
      await connection.end();
    }
  },

  async deleteToken(id: number): Promise<boolean> {
    const connection = await createMainDbConnection();
    try {
      await connection.execute(`DELETE FROM ${REL_TABLE} WHERE tokenId = ?`, [id]);
      await connection.execute(`DELETE FROM ${TOKEN_TABLE} WHERE id = ?`, [id]);
      return true;
    } finally {
      await connection.end();
    }
  },

  async updateToken(id: number, payload: PushTokenInput): Promise<PushToken | null> {
    const connection = await createMainDbConnection();
    try {
      const fields: string[] = [];
      const params: Array<string | number | null> = [];

      if (payload.token !== undefined) {
        fields.push('token = ?');
        params.push(payload.token);
      }
      if (payload.tags !== undefined) {
        fields.push('tags = ?');
        params.push(stringifyField(payload.tags));
      }
      if (payload.status !== undefined) {
        fields.push('status = ?');
        params.push(payload.status);
      }
      if (fields.length > 0) {
        fields.push('updatedAt = CURRENT_TIMESTAMP');
        params.push(id);
        await connection.execute(
          `UPDATE ${TOKEN_TABLE} SET ${fields.join(', ')} WHERE id = ?`,
          params
        );
      }

      if (payload.audienceIds !== undefined) {
        await connection.execute(`DELETE FROM ${REL_TABLE} WHERE tokenId = ?`, [id]);
        if (payload.audienceIds.length > 0) {
          await attachTokenToAudiences(connection, id, payload.audienceIds, false);
        }
      }

      const [rows] = await connection.execute<RowDataPacket[]>(
        `
          SELECT t.*, GROUP_CONCAT(DISTINCT at.audienceId) AS audienceIds
          FROM ${TOKEN_TABLE} t
          LEFT JOIN ${REL_TABLE} at ON at.tokenId = t.id
          WHERE t.id = ?
          GROUP BY t.id
        `,
        [id]
      );
      if (rows.length === 0) {
        return null;
      }
      return mapToken(rows[0]);
    } finally {
      await connection.end();
    }
  },

  async importTokens(payload: PushTokenImportPayload): Promise<{ imported: number }> {
    const connection = await createMainDbConnection();
    let imported = 0;

    try {
      for (const tokenPayload of payload.tokens) {
        if (!tokenPayload.token) {
          continue;
        }

        const [existing] = await connection.execute<RowDataPacket[]>(
          `SELECT id FROM ${TOKEN_TABLE} WHERE token = ?`,
          [tokenPayload.token]
        );

        let tokenId: number | null = null;
        const tags = stringifyField(tokenPayload.tags);
        const status = tokenPayload.status || 'active';

        if (existing.length > 0) {
          tokenId = existing[0].id;
          if (payload.replace) {
            await connection.execute(
              `UPDATE ${TOKEN_TABLE}
               SET tags = ?, status = ?, updatedAt = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [
                tags,
                status,
                tokenId,
              ]
            );
            imported += 1;
          }
        } else {
          const [result] = await connection.execute<ResultSetHeader>(
            `INSERT INTO ${TOKEN_TABLE}
              (token, tags, status, lastActiveAt)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
            [
              tokenPayload.token,
              tags,
              status,
            ]
          );
          tokenId = result.insertId;
          imported += 1;
        }

        if (tokenId) {
          const audienceIds = tokenPayload.audienceIds || [];
          if (payload.audienceId) {
            audienceIds.push(payload.audienceId);
          }
          if (audienceIds.length > 0 || payload.replace) {
            await attachTokenToAudiences(connection, tokenId, audienceIds, !!payload.replace);
          }
        }
      }

      return { imported };
    } finally {
      await connection.end();
    }
  },
};

