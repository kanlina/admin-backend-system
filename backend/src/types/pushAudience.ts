export type PushAudienceStatus = 'active' | 'inactive';
export type PushTokenStatus = 'active' | 'revoked';

export interface PushAudienceInput {
  name: string;
  description?: string;
  tags?: string[];
  status?: PushAudienceStatus;
}

export interface PushAudience extends PushAudienceInput {
  id: number;
  status: PushAudienceStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface PushTokenInput {
  token: string;
  tags?: string[];
  status?: PushTokenStatus;
  audienceIds?: number[];
}

export interface PushToken extends PushTokenInput {
  id: number;
  status: PushTokenStatus;
  lastActiveAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PushTokenImportPayload {
  tokens: PushTokenInput[];
  replace?: boolean;
  audienceId?: number;
}

