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
  createdAt: string;
  updatedAt: string;
}

export interface PushTemplateInput {
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

