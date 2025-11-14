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
  createdAt: string;
  updatedAt: string;
}

export interface PushConfigInput {
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

