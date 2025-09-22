import { Request, Response } from 'express';
import { TagService } from '../services/tagService';
import { CreateTagRequest, PaginationQuery, ApiResponse } from '../types';

const tagService = new TagService();

export class TagController {
  async createTag(req: Request<{}, ApiResponse, CreateTagRequest>, res: Response<ApiResponse>) {
    try {
      const { name } = req.body;

      // 检查标签是否已存在
      const existingTag = await tagService.getTagByName(name);
      if (existingTag) {
        return res.status(400).json({
          success: false,
          error: '标签名称已存在',
        });
      }

      const tag = await tagService.createTag(req.body);

      res.status(201).json({
        success: true,
        data: tag,
        message: '标签创建成功',
      });
    } catch (error) {
      console.error('Create tag error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async getTags(req: Request<{}, ApiResponse, {}, PaginationQuery>, res: Response<ApiResponse>) {
    try {
      const result = await tagService.getTags(req.query);
      
      res.json({
        success: true,
        data: result.tags,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get tags error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async getAllTags(req: Request, res: Response<ApiResponse>) {
    try {
      const tags = await tagService.getAllTags();
      
      res.json({
        success: true,
        data: tags,
      });
    } catch (error) {
      console.error('Get all tags error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async getTagById(req: Request<{ id: string }>, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const tag = await tagService.getTagById(id);

      if (!tag) {
        return res.status(404).json({
          success: false,
          error: '标签不存在',
        });
      }

      res.json({
        success: true,
        data: tag,
      });
    } catch (error) {
      console.error('Get tag error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async updateTag(req: Request<{ id: string }, ApiResponse, Partial<CreateTagRequest>>, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      // 如果要更新名称，检查是否已存在
      if (name) {
        const existingTag = await tagService.getTagByName(name);
        if (existingTag && existingTag.id !== id) {
          return res.status(400).json({
            success: false,
            error: '标签名称已存在',
          });
        }
      }

      const tag = await tagService.updateTag(id, req.body);

      res.json({
        success: true,
        data: tag,
        message: '标签更新成功',
      });
    } catch (error) {
      console.error('Update tag error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async deleteTag(req: Request<{ id: string }>, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      await tagService.deleteTag(id);

      res.json({
        success: true,
        message: '标签删除成功',
      });
    } catch (error) {
      console.error('Delete tag error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async getPopularTags(req: Request<{}, ApiResponse, {}, { limit?: string }>, res: Response<ApiResponse>) {
    try {
      const limit = parseInt(req.query.limit || '10');
      const tags = await tagService.getPopularTags(limit);
      
      res.json({
        success: true,
        data: tags,
      });
    } catch (error) {
      console.error('Get popular tags error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }
}
