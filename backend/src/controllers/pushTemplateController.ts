import { Request, Response } from 'express';
import { pushTemplateService } from '../services/pushTemplateService';

const parseBoolean = (value?: any): boolean | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return undefined;
};

const parseDataPayload = (value: any) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      throw new Error('dataPayload 必须为 JSON 对象');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'dataPayload JSON 解析失败');
    }
  }
  throw new Error('dataPayload 必须为 JSON 对象');
};

const parseTags = (value: any): string[] | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    if (!value.trim()) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean);
      }
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return undefined;
};

const parseId = (value: any): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return undefined;
  }
  return num;
};

export const getPushTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await pushTemplateService.getTemplates({
      search: req.query.search ? String(req.query.search) : undefined,
      pushConfigId: parseId(req.query.pushConfigId),
      pushAudienceId: parseId(req.query.pushAudienceId),
      enabled: parseBoolean(req.query.enabled),
    });
    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('[pushTemplateController] 获取模版失败:', error);
    res.status(500).json({
      success: false,
      message: '获取推送模版失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const getPushTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = await pushTemplateService.getTemplateById(Number(id));
    if (!template) {
      return res.status(404).json({
        success: false,
        message: '模版不存在',
      });
    }
    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('[pushTemplateController] 获取模版详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取推送模版详情失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const createPushTemplate = async (req: Request, res: Response) => {
  try {
    const { name, title, body } = req.body;
    const pushConfigId = parseId(req.body.pushConfigId);
    const pushAudienceId = parseId(req.body.pushAudienceId);

    if (!name || !title || !body || !pushConfigId || !pushAudienceId) {
      return res.status(400).json({
        success: false,
        message: '模版名称、推送配置、推送人群、标题、正文为必填项',
      });
    }

    let dataPayload;
    try {
      dataPayload = parseDataPayload(req.body.dataPayload);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'dataPayload 格式错误',
      });
    }

    const template = await pushTemplateService.createTemplate({
      name: String(name).trim(),
      templateKey: typeof req.body.templateKey === 'string' ? req.body.templateKey : undefined,
      pushConfigId,
      pushAudienceId,
      title,
      body,
      dataPayload,
      clickAction: req.body.clickAction,
      imageUrl: req.body.imageUrl,
      description: req.body.description,
      tags: parseTags(req.body.tags),
      enabled: parseBoolean(req.body.enabled) ?? true,
    });

    res.status(201).json({
      success: true,
      data: template,
      message: '创建模版成功',
    });
  } catch (error: any) {
    console.error('[pushTemplateController] 创建模版失败:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: '模版唯一标识已存在，请更换 templateKey 或平台',
      });
    }
    res.status(500).json({
      success: false,
      message: '创建推送模版失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const updatePushTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let dataPayload;
    if (req.body.dataPayload !== undefined) {
      try {
        dataPayload = parseDataPayload(req.body.dataPayload);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error instanceof Error ? error.message : 'dataPayload 格式错误',
        });
      }
    }

    const template = await pushTemplateService.updateTemplate(Number(id), {
      ...req.body,
      pushConfigId: req.body.pushConfigId !== undefined ? parseId(req.body.pushConfigId) : undefined,
      pushAudienceId: req.body.pushAudienceId !== undefined ? parseId(req.body.pushAudienceId) : undefined,
      dataPayload,
      tags: req.body.tags !== undefined ? parseTags(req.body.tags) : undefined,
      enabled: req.body.enabled !== undefined ? parseBoolean(req.body.enabled) : undefined,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: '模版不存在',
      });
    }

    res.json({
      success: true,
      data: template,
      message: '更新模版成功',
    });
  } catch (error: any) {
    console.error('[pushTemplateController] 更新模版失败:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: '模版唯一标识已存在，请更换 templateKey 或平台',
      });
    }
    res.status(500).json({
      success: false,
      message: '更新推送模版失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const deletePushTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pushTemplateService.deleteTemplate(Number(id));
    res.json({
      success: true,
      message: '删除模版成功',
    });
  } catch (error) {
    console.error('[pushTemplateController] 删除模版失败:', error);
    res.status(500).json({
      success: false,
      message: '删除推送模版失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

