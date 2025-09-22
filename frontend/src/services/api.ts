import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, LoginRequest, RegisterRequest, AuthResponse } from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
      timeout: 10000,
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

  // 文章相关
  async getPosts(params?: any): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/posts', { params });
    return response.data;
  }

  async getPostById(id: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/posts/${id}`);
    return response.data;
  }

  async createPost(data: any): Promise<ApiResponse<any>> {
    const response = await this.api.post('/posts', data);
    return response.data;
  }

  async updatePost(id: string, data: any): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/posts/${id}`, data);
    return response.data;
  }

  async deletePost(id: string): Promise<ApiResponse<any>> {
    const response = await this.api.delete(`/posts/${id}`);
    return response.data;
  }

  async getPostStats(): Promise<ApiResponse<any>> {
    const response = await this.api.get('/posts/stats');
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
}

export const apiService = new ApiService();
