import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import type { PushConfig } from '../types/pushConfig';
import type { PushTemplate } from '../types/pushTemplate';

interface SendNotificationOptions {
  pushConfig: PushConfig;
  tokens: string[];
  template: PushTemplate;
}

interface FcmSendResult {
  success: number;
  failure: number;
  errors: string[];
}

const LEGACY_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const LEGACY_BATCH_SIZE = 500;

const serviceAccountTokenCache = new Map<number, { token: string; expiresAt: number }>();

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

const normalizeDataPayload = (data?: Record<string, any>) => {
  if (!data) {
    return undefined;
  }
  return Object.entries(data).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
    return acc;
  }, {});
};

const buildNotificationPayload = (template: PushTemplate) => {
  const payload: Record<string, string> = {
    title: template.title,
    body: template.body,
  };
  if (template.imageUrl) {
    payload.image = template.imageUrl;
  }
  if (template.clickAction) {
    payload.click_action = template.clickAction;
  }
  return payload;
};

const getAccessToken = async (pushConfigId: number, serviceAccountJson: string) => {
  const cached = serviceAccountTokenCache.get(pushConfigId);
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 60 > now) {
    return cached.token;
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  const iat = now;
  const exp = iat + 3600;
  const jwtPayload = {
    iss: serviceAccount.client_email,
    scope: FCM_SCOPE,
    aud: OAUTH_TOKEN_URL,
    iat,
    exp,
  };

  const signedJwt = jwt.sign(jwtPayload, serviceAccount.private_key, { algorithm: 'RS256' });
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`获取FCM访问令牌失败: ${text}`);
  }

  const tokenPayload = (await response.json()) as { access_token: string; expires_in: number };
  const token = tokenPayload.access_token;
  const expiresAt = now + (tokenPayload.expires_in || 3600);
  serviceAccountTokenCache.set(pushConfigId, { token, expiresAt });
  return token;
};

const sendWithLegacyKey = async ({
  serverKey,
  tokens,
  template,
}: {
  serverKey: string;
  tokens: string[];
  template: PushTemplate;
}): Promise<FcmSendResult> => {
  let success = 0;
  let failure = 0;
  const errors: string[] = [];
  const notificationPayload = buildNotificationPayload(template);
  const dataPayload = normalizeDataPayload(template.dataPayload);

  for (const batch of chunkArray(tokens, LEGACY_BATCH_SIZE)) {
    const body: Record<string, any> = {
      registration_ids: batch,
      priority: 'high',
      notification: notificationPayload,
    };
    if (dataPayload && Object.keys(dataPayload).length > 0) {
      body.data = dataPayload;
    }

    const response = await fetch(LEGACY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${serverKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      failure += batch.length;
      errors.push(`HTTP ${response.status}: ${text.slice(0, 200)}`);
      continue;
    }

    const result = (await response.json()) as {
      success?: number;
      failure?: number;
      results?: Array<{ error?: string }>;
    };
    success += result.success || 0;
    failure += result.failure || 0;
    result.results?.forEach((item, index) => {
      if (item.error) {
        errors.push(`${item.error} (token tail: ${batch[index]?.slice(-8)})`);
      }
    });
  }

  return { success, failure, errors };
};

const sendWithServiceAccount = async ({
  pushConfig,
  tokens,
  template,
}: {
  pushConfig: PushConfig;
  tokens: string[];
  template: PushTemplate;
}): Promise<FcmSendResult> => {
  const serviceAccountJson = pushConfig.serviceAccount;
  if (!serviceAccountJson) {
    throw new Error('Service Account JSON 未配置');
  }
  const serviceAccount = JSON.parse(serviceAccountJson);
  const projectId = pushConfig.projectId || serviceAccount.project_id;
  if (!projectId) {
    throw new Error('Service Account JSON 缺少 projectId');
  }
  const accessToken = await getAccessToken(pushConfig.id, serviceAccountJson);
  const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const notificationPayload = buildNotificationPayload(template);
  const dataPayload = normalizeDataPayload(template.dataPayload);

  let success = 0;
  let failure = 0;
  const errors: string[] = [];

  for (const token of tokens) {
    const body: Record<string, any> = {
      message: {
        token,
        notification: notificationPayload,
      },
    };
    if (dataPayload && Object.keys(dataPayload).length > 0) {
      body.message.data = dataPayload;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      success += 1;
    } else {
      failure += 1;
      const text = await response.text();
      errors.push(`Token tail ${token.slice(-8)}: ${text.slice(0, 200)}`);
    }
  }

  return { success, failure, errors };
};

export const fcmService = {
  async sendNotification({ pushConfig, tokens, template }: SendNotificationOptions): Promise<FcmSendResult> {
    if (pushConfig.serviceAccount) {
      return sendWithServiceAccount({ pushConfig, tokens, template });
    }
    if (pushConfig.serverKey) {
      return sendWithLegacyKey({ serverKey: pushConfig.serverKey, tokens, template });
    }
    throw new Error('推送配置未提供 Service Account 或 Server Key');
  },
};

export default fcmService;

