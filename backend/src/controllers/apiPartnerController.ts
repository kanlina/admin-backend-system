import { Request, Response } from 'express';
import { ApiPartnerService } from '../services/apiPartnerService';
import { CreateApiPartnerRequest, UpdateApiPartnerRequest, ApiPartnerQuery } from '../types/apiPartner';
import { ApiResponse } from '../types';

const apiPartnerService = new ApiPartnerService();

export class ApiPartnerController {
  /**
   * 获取API合作伙伴配置列表
   */
  async getApiPartnerConfigs(req: Request<{}, ApiResponse, {}, ApiPartnerQuery>, res: Response<ApiResponse>) {
    try {
      const query: ApiPartnerQuery = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
        status: req.query.status ? Number(req.query.status) : undefined,
        type: req.query.type ? Number(req.query.type) : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };

      const result = await apiPartnerService.getApiPartnerConfigs(query);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: '获取API合作伙伴配置成功'
      });
    } catch (error) {
      console.error('Get API partner configs error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 根据ID获取API合作伙伴配置
   */
  async getApiPartnerConfigById(req: Request<{ id: string }>, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const config = await apiPartnerService.getApiPartnerConfigById(Number(id));

      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'API合作伙伴配置不存在',
        });
      }

      res.json({
        success: true,
        data: config,
        message: '获取API合作伙伴配置成功'
      });
    } catch (error) {
      console.error('Get API partner config by ID error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 创建API合作伙伴配置
   */
  async createApiPartnerConfig(req: Request<{}, ApiResponse, CreateApiPartnerRequest>, res: Response<ApiResponse>) {
    try {
      const data = req.body;

      // 验证必填字段
      if (!data.app_id || !data.partner_name || !data.partner_api || !data.secret_key) {
        return res.status(400).json({
          success: false,
          error: '缺少必填字段：app_id, partner_name, partner_api, secret_key',
        });
      }

      // 检查app_id是否已存在
      const existing = await apiPartnerService.getApiPartnerConfigByAppId(data.app_id);
      if (existing) {
        return res.status(400).json({
          success: false,
          error: '该应用ID已存在',
        });
      }

      const newConfig = await apiPartnerService.createApiPartnerConfig(data);

      res.status(201).json({
        success: true,
        data: newConfig,
        message: '创建API合作伙伴配置成功'
      });
    } catch (error) {
      console.error('Create API partner config error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 更新API合作伙伴配置
   */
  async updateApiPartnerConfig(req: Request<{ id: string }, ApiResponse, UpdateApiPartnerRequest>, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const data = { ...req.body, id: Number(id) };

      const updatedConfig = await apiPartnerService.updateApiPartnerConfig(Number(id), data);

      res.json({
        success: true,
        data: updatedConfig,
        message: '更新API合作伙伴配置成功'
      });
    } catch (error) {
      console.error('Update API partner config error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 删除API合作伙伴配置
   */
  async deleteApiPartnerConfig(req: Request<{ id: string }>, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const success = await apiPartnerService.deleteApiPartnerConfig(Number(id));

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'API合作伙伴配置不存在',
        });
      }

      res.json({
        success: true,
        message: '删除API合作伙伴配置成功'
      });
    } catch (error) {
      console.error('Delete API partner config error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 获取所有启用的API合作伙伴配置
   */
  async getAllEnabledPartners(req: Request, res: Response<ApiResponse>) {
    try {
      const partners = await apiPartnerService.getAllEnabledPartners();

      res.json({
        success: true,
        data: partners,
        message: '获取启用的合作伙伴配置成功'
      });
    } catch (error) {
      console.error('Get all enabled partners error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }

  /**
   * 根据应用ID获取API合作伙伴配置
   */
  async getApiPartnerConfigByAppId(req: Request<{ appId: string }>, res: Response<ApiResponse>) {
    try {
      const { appId } = req.params;
      const config = await apiPartnerService.getApiPartnerConfigByAppId(Number(appId));

      if (!config) {
        return res.status(404).json({
          success: false,
          error: '未找到该应用ID的合作伙伴配置',
        });
      }

      res.json({
        success: true,
        data: config,
        message: '获取API合作伙伴配置成功'
      });
    } catch (error) {
      console.error('Get API partner config by app ID error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }
}
