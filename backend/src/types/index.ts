import { Request } from 'express';
import { User } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User;
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

export interface CreatePostRequest {
  title: string;
  content: string;
  summary?: string;
  cover?: string;
  status?: string;
  tagIds?: string[];
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  summary?: string;
  cover?: string;
  status?: string;
  tagIds?: string[];
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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
