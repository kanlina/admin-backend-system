import { randomUUID } from 'crypto';
import { createMainDbConnection } from '../utils/database';

const FAVORITE_KEY_PREFIX = 'attribution_favorites:';

export interface FavoriteAdSequenceEntry {
  value: string;
  favoritedAt: number;
}

export type FavoriteAdSequenceMap = Record<string, FavoriteAdSequenceEntry[]>;

const normalizeFavorites = (raw: any): FavoriteAdSequenceMap => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const result: FavoriteAdSequenceMap = {};
  Object.entries(raw).forEach(([media, list]) => {
    if (!Array.isArray(list)) return;
    const normalized = list
      .map(item => {
        if (!item || typeof item !== 'object') return null;
        const value = typeof item.value === 'string' ? item.value : '';
        const favoritedAt = typeof item.favoritedAt === 'number' ? item.favoritedAt : Date.now();
        if (!value) return null;
        return { value, favoritedAt };
      })
      .filter((entry): entry is FavoriteAdSequenceEntry => !!entry)
      .sort((a, b) => b.favoritedAt - a.favoritedAt);
    if (normalized.length > 0) {
      result[media] = normalized;
    }
  });
  return result;
};

const buildKey = (userId: string) => `${FAVORITE_KEY_PREFIX}${userId}`;

export const userPreferenceService = {
  async getFavoriteAdSequences(userId: string): Promise<FavoriteAdSequenceMap> {
    const connection = await createMainDbConnection();
    try {
      const key = buildKey(userId);
      const [rows] = await connection.execute('SELECT `value` FROM system_configs WHERE `key` = ?', [key]);
      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0] as { value?: string };
        if (row.value) {
          try {
            const parsed = JSON.parse(row.value);
            return normalizeFavorites(parsed);
          } catch (error) {
            console.error('[Favorites] 解析收藏配置失败:', error);
            return {};
          }
        }
      }
      return {};
    } finally {
      await connection.end();
    }
  },

  async saveFavoriteAdSequences(userId: string, favorites: FavoriteAdSequenceMap): Promise<void> {
    const connection = await createMainDbConnection();
    try {
      const key = buildKey(userId);
      const value = JSON.stringify(favorites);
      await connection.execute(
        `
          INSERT INTO system_configs (id, \`key\`, \`value\`, \`type\`, \`createdAt\`, \`updatedAt\`)
          VALUES (?, ?, ?, 'JSON', NOW(), NOW())
          ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), \`type\` = 'JSON', \`updatedAt\` = NOW()
        `,
        [randomUUID(), key, value],
      );
    } finally {
      await connection.end();
    }
  },

  async toggleFavoriteAdSequence(
    userId: string,
    mediaSource: string,
    adSequence: string,
  ): Promise<{ favorites: FavoriteAdSequenceMap; added: boolean }> {
    const trimmedMedia = mediaSource.trim();
    const trimmedAd = adSequence.trim();
    if (!trimmedMedia || !trimmedAd) {
      throw new Error('媒体渠道与广告序列不能为空');
    }

    const favorites = await this.getFavoriteAdSequences(userId);
    const list = favorites[trimmedMedia] ? [...favorites[trimmedMedia]] : [];
    const existingIndex = list.findIndex(entry => entry.value === trimmedAd);

    let added = false;
    if (existingIndex >= 0) {
      list.splice(existingIndex, 1);
    } else {
      list.unshift({ value: trimmedAd, favoritedAt: Date.now() });
      added = true;
    }

    if (list.length > 0) {
      favorites[trimmedMedia] = list.sort((a, b) => b.favoritedAt - a.favoritedAt);
    } else {
      delete favorites[trimmedMedia];
    }

    await this.saveFavoriteAdSequences(userId, favorites);
    return { favorites, added };
  },
};

