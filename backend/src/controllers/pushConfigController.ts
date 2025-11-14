import { Request, Response } from 'express';
import { pushConfigService } from '../services/pushConfigService';
import { PushPlatform } from '../types/pushConfig';

export const getPushConfigs = async (req: Request, res: Response) => {
  try {
    const { appId, platform, enabled } = req.query;
    const configs = await pushConfigService.getPushConfigs({
      appId: appId ? String(appId) : undefined,
      platform: platform ? String(platform) as PushPlatform : undefined,
      enabled: enabled !== undefined ? enabled === 'true' || enabled === '1' : undefined,
    });

    res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    console.error('[pushConfigController] 获取配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取推送配置失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const getPushConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = await pushConfigService.getPushConfigById(Number(id));
    if (!config) {
      return res.status(404).json({
        success: false,
        message: '配置不存在',
      });
    }
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('[pushConfigController] 获取配置详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取推送配置失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const createPushConfig = async (req: Request, res: Response) => {
  try {
    const { name, appId, platform, projectId } = req.body;

    if (!name || !appId || !platform || !projectId) {
      return res.status(400).json({
        success: false,
        message: '请填写必填字段：name、appId、platform、projectId',
      });
    }

    const config = await pushConfigService.createPushConfig({
      name,
      appId,
      platform,
      projectId,
      serverKey: req.body.serverKey,
      serviceAccount: req.body.serviceAccount,
      vapidKey: req.body.vapidKey,
      description: req.body.description,
      enabled: req.body.enabled,
    });

    res.status(201).json({
      success: true,
      data: config,
      message: '创建推送配置成功',
    });
  } catch (error) {
    console.error('[pushConfigController] 创建配置失败:', error);
    res.status(500).json({
      success: false,
      message: '创建推送配置失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const updatePushConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = await pushConfigService.updatePushConfig(Number(id), req.body);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: '配置不存在',
      });
    }
    res.json({
      success: true,
      data: config,
      message: '更新推送配置成功',
    });
  } catch (error) {
    console.error('[pushConfigController] 更新配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新推送配置失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const deletePushConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pushConfigService.deletePushConfig(Number(id));
    res.json({
      success: true,
      message: '删除推送配置成功',
    });
  } catch (error) {
    console.error('[pushConfigController] 删除配置失败:', error);
    res.status(500).json({
      success: false,
      message: '删除推送配置失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

