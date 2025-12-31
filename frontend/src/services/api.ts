import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type {
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  FavoriteAdSequence,
  PushConfig,
  PushConfigPayload,
  PushPlatform,
  PushAudience,
  PushAudiencePayload,
  PushToken,
  PushTokenPayload,
  PushTemplate,
  PushTemplatePayload,
  PushTask,
  PushTaskPayload,
} from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
      timeout: 60000, // 上传耗时较长时保持连接
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.api.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // 清除本地存储的token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // 重定向到登录页
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // 认证相关
  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.api.post('/auth/login', data);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.api.post('/auth/register', data);
    return response.data;
  }

  async getProfile(): Promise<ApiResponse<{ user: any }>> {
    const response = await this.api.get('/auth/profile');
    return response.data;
  }

  // 用户相关
  async getUsers(params?: any): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/users', { params });
    return response.data;
  }

  async getUserById(id: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, data: any): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string): Promise<ApiResponse<any>> {
    const response = await this.api.delete(`/users/${id}`);
    return response.data;
  }

  async getUserStats(): Promise<ApiResponse<any>> {
    const response = await this.api.get('/users/stats');
    return response.data;
  }

  async createUser(data: { username: string; email: string; password: string; role?: string }): Promise<ApiResponse<any>> {
    const response = await this.api.post('/users', data);
    return response.data;
  }

  async resetPassword(id: string, password: string): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/users/${id}/reset-password`, { password });
    return response.data;
  }


  // 标签相关
  async getTags(params?: any): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/tags', { params });
    return response.data;
  }

  async getAllTags(): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/tags/all');
    return response.data;
  }

  async getTagById(id: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/tags/${id}`);
    return response.data;
  }

  async createTag(data: any): Promise<ApiResponse<any>> {
    const response = await this.api.post('/tags', data);
    return response.data;
  }

  async updateTag(id: string, data: any): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/tags/${id}`, data);
    return response.data;
  }

  async deleteTag(id: string): Promise<ApiResponse<any>> {
    const response = await this.api.delete(`/tags/${id}`);
    return response.data;
  }

  async getPopularTags(limit?: number): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/tags/popular', { 
      params: { limit } 
    });
    return response.data;
  }

  // 评分数据相关
  async getRatingData(params?: any): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/rating-data', { params });
    return response.data;
  }

  // 内转数据相关
  async getInternalTransferData(params?: any): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/internal-transfer-data', { params });
    return response.data;
  }

  async getInternalTransferChartData(params?: any): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/internal-transfer-chart', { params });
    return response.data;
  }

  async getInternalTransferDetails(params?: any): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/internal-transfer-details', { params });
    return response.data;
  }

  // 归因数据相关
  async getAttributionAppIds(): Promise<ApiResponse<string[]>> {
    const response = await this.api.get('/attribution-app-ids');
    return response.data;
  }

  async getAttributionMediaSources(): Promise<ApiResponse<string[]>> {
    const response = await this.api.get('/attribution-media-sources');
    return response.data;
  }

  async getAttributionAdSequences(params?: { mediaSource?: string }): Promise<ApiResponse<string[]>> {
    const response = await this.api.get('/attribution-ad-sequences', { params });
    return response.data;
  }

  async getAttributionEventNames(dataSource: 'adjust' | 'appsflyer' = 'adjust'): Promise<ApiResponse<string[]>> {
    const response = await this.api.get('/attribution-event-names', { params: { dataSource } });
    return response.data;
  }

  async getAttributionData(params?: any): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/attribution-data', { params });
    return response.data;
  }

  async getAttributionChartData(params?: any): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/attribution-chart', { params });
    return response.data;
  }

  async getAttributionDetails(params?: any): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/attribution-details', { params });
    return response.data;
  }

  async getAttributionFavorites(): Promise<ApiResponse<Record<string, FavoriteAdSequence[]>>> {
    const response = await this.api.get('/attribution-favorites');
    return response.data;
  }

  async syncAttributionFavorites(data: {
    favorites?: Array<{ mediaSource: string; adSequence: string }>;
    additions?: Array<{ mediaSource: string; adSequence: string }>;
    removals?: Array<{ mediaSource: string; adSequence: string }>;
  }): Promise<
    ApiResponse<{
      favorites: Record<string, FavoriteAdSequence[]>;
    }>
  > {
    const response = await this.api.post('/attribution-favorites', data);
    return response.data;
  }

  async getAttributionComparison(params?: any): Promise<ApiResponse<any>> {
    const response = await this.api.get('/attribution-comparison', { params });
    return response.data;
  }

  // API合作伙伴配置相关
  async getApiPartnerConfigs(params?: any): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/api-partner-configs', { params });
    return response.data;
  }

  async getApiPartnerConfigById(id: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/api-partner-configs/${id}`);
    return response.data;
  }

  async createApiPartnerConfig(data: any): Promise<ApiResponse<any>> {
    const response = await this.api.post('/api-partner-configs', data);
    return response.data;
  }

  async updateApiPartnerConfig(id: string, data: any): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/api-partner-configs/${id}`, data);
    return response.data;
  }

  async deleteApiPartnerConfig(id: string): Promise<ApiResponse<any>> {
    const response = await this.api.delete(`/api-partner-configs/${id}`);
    return response.data;
  }

  // 推送配置相关
  async getPushConfigs(params?: { appId?: string; platform?: PushPlatform; enabled?: boolean }): Promise<ApiResponse<PushConfig[]>> {
    const response = await this.api.get('/push-configs', { params });
    return response.data;
  }

  async getPushConfigById(id: string): Promise<ApiResponse<PushConfig>> {
    const response = await this.api.get(`/push-configs/${id}`);
    return response.data;
  }

  async createPushConfig(data: PushConfigPayload): Promise<ApiResponse<PushConfig>> {
    const response = await this.api.post('/push-configs', data);
    return response.data;
  }

  async updatePushConfig(id: string, data: Partial<PushConfigPayload>): Promise<ApiResponse<PushConfig>> {
    const response = await this.api.put(`/push-configs/${id}`, data);
    return response.data;
  }

  async deletePushConfig(id: string): Promise<ApiResponse<null>> {
    const response = await this.api.delete(`/push-configs/${id}`);
    return response.data;
  }

  async getPushTemplates(params?: {
    search?: string;
    pushConfigId?: number;
    pushAudienceId?: number;
    enabled?: boolean;
  }): Promise<ApiResponse<PushTemplate[]>> {
    const response = await this.api.get('/push-templates', { params });
    return response.data;
  }

  async getPushTemplateById(id: string): Promise<ApiResponse<PushTemplate>> {
    const response = await this.api.get(`/push-templates/${id}`);
    return response.data;
  }

  async createPushTemplate(data: PushTemplatePayload): Promise<ApiResponse<PushTemplate>> {
    const response = await this.api.post('/push-templates', data);
    return response.data;
  }

  async updatePushTemplate(id: string, data: Partial<PushTemplatePayload>): Promise<ApiResponse<PushTemplate>> {
    const response = await this.api.put(`/push-templates/${id}`, data);
    return response.data;
  }

  async deletePushTemplate(id: string): Promise<ApiResponse<null>> {
    const response = await this.api.delete(`/push-templates/${id}`);
    return response.data;
  }

  async getPushTasks(params?: { status?: string; search?: string }): Promise<ApiResponse<PushTask[]>> {
    const response = await this.api.get('/push-tasks', { params });
    return response.data;
  }

  async getPushTaskById(id: string): Promise<ApiResponse<PushTask>> {
    const response = await this.api.get(`/push-tasks/${id}`);
    return response.data;
  }

  async createPushTask(data: PushTaskPayload): Promise<ApiResponse<PushTask>> {
    const response = await this.api.post('/push-tasks', data);
    return response.data;
  }

  async updatePushTask(id: string, data: Partial<PushTaskPayload>): Promise<ApiResponse<PushTask>> {
    const response = await this.api.put(`/push-tasks/${id}`, data);
    return response.data;
  }

  async deletePushTask(id: string): Promise<ApiResponse<null>> {
    const response = await this.api.delete(`/push-tasks/${id}`);
    return response.data;
  }

  async executePushTask(id: string): Promise<ApiResponse<PushTask>> {
    const response = await this.api.post(`/push-tasks/${id}/execute`);
    return response.data;
  }

  // 推送人群/Token 管理
  async getPushAudiences(params?: any): Promise<ApiResponse<PushAudience[]>> {
    const response = await this.api.get('/push-audiences', { params });
    return response.data;
  }

  async createPushAudience(data: PushAudiencePayload): Promise<ApiResponse<PushAudience>> {
    const response = await this.api.post('/push-audiences', data);
    return response.data;
  }

  async updatePushAudience(id: string, data: PushAudiencePayload): Promise<ApiResponse<PushAudience>> {
    const response = await this.api.put(`/push-audiences/${id}`, data);
    return response.data;
  }

  async deletePushAudience(id: string): Promise<ApiResponse<null>> {
    const response = await this.api.delete(`/push-audiences/${id}`);
    return response.data;
  }

  async getPushTokens(params?: any): Promise<ApiResponse<PushToken[]>> {
    const response = await this.api.get('/push-tokens', { params });
    return response.data;
  }

  async updatePushToken(id: string, data: PushTokenPayload): Promise<ApiResponse<PushToken>> {
    const response = await this.api.put(`/push-tokens/${id}`, data);
    return response.data;
  }

  async deletePushToken(id: string): Promise<ApiResponse<null>> {
    const response = await this.api.delete(`/push-tokens/${id}`);
    return response.data;
  }

  async importPushTokens(data: {
    tokens: PushTokenPayload[];
    replace?: boolean;
    audienceId?: number;
  }): Promise<ApiResponse<{ imported: number }>> {
    const response = await this.api.post('/push-tokens/import', data);
    return response.data;
  }

  async downloadPushTokenTemplate(): Promise<Blob> {
    const response = await this.api.get('/push-tokens/template', {
      responseType: 'blob',
    });
    return response.data;
  }

  async importPushTokensFromFile(data: FormData): Promise<ApiResponse<{ imported: number }>> {
    const response = await this.api.post('/push-tokens/import-excel', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async parsePushTokensFromFile(data: FormData): Promise<ApiResponse<{ tokens: string[] }>> {
    const response = await this.api.post('/push-tokens/parse-excel', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  // Content 内容管理相关
  async getContents(params?: any): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/content', { params });
    return response.data;
  }

  async getContentById(id: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/content/${id}`);
    return response.data;
  }

  async uploadContentImage(file: File | string, ext?: string): Promise<ApiResponse<{ url: string }>> {
    if (file instanceof File) {
      const formData = new FormData();
      formData.append('file', file);
      if (ext) {
        formData.append('ext', ext);
      }

      const response = await this.api.post('/content/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    }

    const response = await this.api.post('/content/upload', { file, ext });
    return response.data;
  }

  async createContent(data: any): Promise<ApiResponse<any>> {
    const response = await this.api.post('/content', data);
    return response.data;
  }

  async updateContent(id: string, data: any): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/content/${id}`, data);
    return response.data;
  }

  async deleteContent(id: string): Promise<ApiResponse<any>> {
    const response = await this.api.delete(`/content/${id}`);
    return response.data;
  }

  async deleteContents(ids: string[]): Promise<ApiResponse<any>> {
    const response = await this.api.post('/content/batch-delete', { ids });
    return response.data;
  }

  async getCategories(appId?: number): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/content/categories', { params: { appId } });
    return response.data;
  }

  async updateContentDetail(id: string, content: string): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/content/${id}/detail`, { content });
    return response.data;
  }

  async toggleContentEnabled(id: string, enabled: number): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/content/${id}/toggle-enabled`, { enabled });
    return response.data;
  }
}

export const apiService = new ApiService();
