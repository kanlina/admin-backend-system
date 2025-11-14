export interface User {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'USER' | 'MODERATOR';
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}


export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteAdSequence {
  value: string;
  favoritedAt: number;
}


export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}


export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: 'ADMIN' | 'USER' | 'MODERATOR';
  isActive?: boolean;
}

export type PushPlatform = 'android' | 'ios' | 'web' | 'all';

export interface PushConfig {
  id: number;
  name: string;
  appId: string;
  platform: PushPlatform;
  projectId: string;
  serverKey?: string | null;
  serviceAccount?: string | null;
  vapidKey?: string | null;
  description?: string | null;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PushConfigPayload {
  name: string;
  appId: string;
  platform: PushPlatform;
  projectId: string;
  serverKey?: string;
  serviceAccount?: string;
  vapidKey?: string;
  description?: string;
  enabled?: boolean;
}

export type PushAudienceStatus = 'active' | 'inactive';

export interface PushAudience {
  id: number;
  name: string;
  description?: string;
  tags?: string[];
  status: PushAudienceStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface PushAudiencePayload {
  name: string;
  description?: string;
  tags?: string[];
  status?: PushAudienceStatus;
}

export type PushTokenStatus = 'active' | 'revoked';

export interface PushToken {
  id: number;
  token: string;
  tags?: string[];
  status: PushTokenStatus;
  lastActiveAt?: string;
  audienceIds?: number[];
  createdAt?: string;
}

export interface PushTokenPayload {
  token: string;
  tags?: string[];
  status?: PushTokenStatus;
  audienceIds?: number[];
}

export interface PushTemplate {
  id: number;
  name: string;
  templateKey: string;
  pushConfigId: number;
  pushAudienceId: number;
  pushConfigName?: string;
  pushAudienceName?: string;
  title: string;
  body: string;
  dataPayload?: Record<string, any>;
  clickAction?: string;
  imageUrl?: string;
  description?: string;
  tags?: string[];
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PushTemplatePayload {
  name: string;
  templateKey?: string;
  pushConfigId: number;
  pushAudienceId: number;
  title: string;
  body: string;
  dataPayload?: Record<string, any>;
  clickAction?: string;
  imageUrl?: string;
  description?: string;
  tags?: string[];
  enabled?: boolean;
}

export type PushTaskStatus = 'draft' | 'scheduled' | 'processing' | 'completed' | 'failed';

export interface PushTask {
  id: number;
  name: string;
  description?: string;
  pushTemplateId: number;
  pushConfigId: number;
  pushAudienceId: number;
  pushConfigName?: string;
  pushTemplateName?: string;
  pushAudienceName?: string;
  createdBy: number;
  createdByName?: string;
  status: PushTaskStatus;
  scheduleTime?: string;
  totalTokens?: number;
  successCount?: number;
  failureCount?: number;
  lastError?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PushTaskPayload {
  name: string;
  description?: string;
  pushTemplateId: number;
  status?: PushTaskStatus;
}
