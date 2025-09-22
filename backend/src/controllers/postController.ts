import { Request, Response } from 'express';
import { PostService } from '../services/postService';
import { CreatePostRequest, UpdatePostRequest, PaginationQuery, ApiResponse } from '../types';

const postService = new PostService();

export class PostController {
  async createPost(req: Request<{}, ApiResponse, CreatePostRequest>, res: Response<ApiResponse>) {
    try {
      const authorId = (req as any).user.id;
      const post = await postService.createPost(authorId, req.body);

      res.status(201).json({
        success: true,
        data: post,
        message: '文章创建成功',
      });
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async getPosts(req: Request<{}, ApiResponse, {}, PaginationQuery & { status?: string; authorId?: string }>, res: Response<ApiResponse>) {
    try {
      const result = await postService.getPosts(req.query);
      
      res.json({
        success: true,
        data: result.posts,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get posts error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async getPostById(req: Request<{ id: string }>, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const post = await postService.getPostById(id);

      if (!post) {
        return res.status(404).json({
          success: false,
          error: '文章不存在',
        });
      }

      // 增加浏览量
      await postService.incrementViews(id);

      res.json({
        success: true,
        data: post,
      });
    } catch (error) {
      console.error('Get post error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async updatePost(req: Request<{ id: string }, ApiResponse, UpdatePostRequest>, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;

      // 检查文章是否存在
      const existingPost = await postService.getPostById(id);
      if (!existingPost) {
        return res.status(404).json({
          success: false,
          error: '文章不存在',
        });
      }

      // 检查权限（只有作者或管理员可以编辑）
      if (existingPost.authorId !== currentUser.id && currentUser.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: '权限不足',
        });
      }

      const post = await postService.updatePost(id, req.body);

      res.json({
        success: true,
        data: post,
        message: '文章更新成功',
      });
    } catch (error) {
      console.error('Update post error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async deletePost(req: Request<{ id: string }>, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;

      // 检查文章是否存在
      const existingPost = await postService.getPostById(id);
      if (!existingPost) {
        return res.status(404).json({
          success: false,
          error: '文章不存在',
        });
      }

      // 检查权限（只有作者或管理员可以删除）
      if (existingPost.authorId !== currentUser.id && currentUser.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: '权限不足',
        });
      }

      await postService.deletePost(id);

      res.json({
        success: true,
        message: '文章删除成功',
      });
    } catch (error) {
      console.error('Delete post error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async getPostStats(req: Request, res: Response<ApiResponse>) {
    try {
      const stats = await postService.getPostStats();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Get post stats error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }
}
