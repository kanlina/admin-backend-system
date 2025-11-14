export type PushTaskStatus = 'draft' | 'scheduled' | 'processing' | 'completed' | 'failed';

export interface PushTaskInput {
  name: string;
  description?: string;
  pushTemplateId: number;
  pushConfigId: number;
  pushAudienceId: number;
  scheduleTime?: string | null;
  status?: PushTaskStatus;
  createdBy: number;
}

export interface PushTask extends PushTaskInput {
  id: number;
  scheduleTime?: string | null;
  status: PushTaskStatus;
  totalTokens?: number;
  successCount?: number;
  failureCount?: number;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
  pushConfigName?: string;
  pushTemplateName?: string;
  pushAudienceName?: string;
  createdByName?: string;
}

