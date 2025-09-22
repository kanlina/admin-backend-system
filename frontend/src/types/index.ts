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

export interface Post {
  id: string;
  title: string;
  content: string;
  summary?: string;
  cover?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  views: number;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  tags: Array<{
    tag: {
      id: string;
      name: string;
      color?: string;
    };
  }>;
  _count: {
    comments: number;
  };
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    posts: number;
  };
}

export interface Comment {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
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

export interface CreatePostRequest {
  title: string;
  content: string;
  summary?: string;
  cover?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  tagIds?: string[];
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
