import { Request, Response } from 'express';
import XLSX from 'xlsx';
import { pushAudienceService } from '../services/pushAudienceService';
import { PushTokenInput } from '../types/pushAudience';

const parseBoolean = (value: any): boolean => value === true || value === 'true' || value === '1';

const parseTags = (value: any): string[] | undefined => {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim());
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim());
      }
    } catch {
      return value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
  }
  return undefined;
};

const normalizeTokensFromBody = (
  req: Request
): PushTokenInput[] => {
  const rawTokens = req.body.tokens;
  const defaultTags = parseTags(req.body.tags);
  const defaultStatus = req.body.status;

  if (Array.isArray(rawTokens)) {
    return rawTokens
      .map((token: any) => {
        if (typeof token === 'string') {
          return {
            token: token.trim(),
            tags: defaultTags,
            status: defaultStatus,
          } as PushTokenInput;
        }
        return {
          token: typeof token?.token === 'string' ? token.token.trim() : '',
          tags: parseTags(token?.tags) || defaultTags,
          status: token?.status || defaultStatus,
        } as PushTokenInput;
      })
      .filter((item) => item.token);
  }

  if (typeof rawTokens === 'string') {
    return rawTokens
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean)
      .map(
        (token) =>
          ({
            token,
            tags: defaultTags,
            status: defaultStatus,
          }) as PushTokenInput
      );
  }

  return [];
};

export const getPushAudiences = async (_req: Request, res: Response) => {
  try {
    const audiences = await pushAudienceService.getAudiences();
    res.json({ success: true, data: audiences });
  } catch (error) {
    console.error('[pushAudienceController] 获取人群失败:', error);
    res.status(500).json({
      success: false,
      message: '获取推送人群失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const createPushAudience = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: '人群名称必填',
      });
    }

    const audience = await pushAudienceService.createAudience({
      name,
      description: req.body.description,
      tags: req.body.tags,
      status: req.body.status,
    });

    res.status(201).json({
      success: true,
      data: audience,
      message: '创建人群成功',
    });
  } catch (error) {
    console.error('[pushAudienceController] 创建人群失败:', error);
    res.status(500).json({
      success: false,
      message: '创建推送人群失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const updatePushAudience = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const audience = await pushAudienceService.updateAudience(Number(id), req.body);
    if (!audience) {
      return res.status(404).json({
        success: false,
        message: '人群不存在',
      });
    }
    res.json({
      success: true,
      data: audience,
      message: '更新人群成功',
    });
  } catch (error) {
    console.error('[pushAudienceController] 更新人群失败:', error);
    res.status(500).json({
      success: false,
      message: '更新推送人群失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const deletePushAudience = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pushAudienceService.deleteAudience(Number(id));
    res.json({
      success: true,
      message: '删除人群成功',
    });
  } catch (error) {
    console.error('[pushAudienceController] 删除人群失败:', error);
    res.status(500).json({
      success: false,
      message: '删除推送人群失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const getPushTokens = async (req: Request, res: Response) => {
  try {
    const tokens = await pushAudienceService.getTokens({
      search: req.query.search ? String(req.query.search) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      audienceId: req.query.audienceId ? Number(req.query.audienceId) : undefined,
    });

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    console.error('[pushAudienceController] 获取Token失败:', error);
    res.status(500).json({
      success: false,
      message: '获取推送Token失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const deletePushToken = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pushAudienceService.deleteToken(Number(id));
    res.json({
      success: true,
      message: '删除Token成功',
    });
  } catch (error) {
    console.error('[pushAudienceController] 删除Token失败:', error);
    res.status(500).json({
      success: false,
      message: '删除推送Token失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const updatePushToken = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = await pushAudienceService.updateToken(Number(id), {
      token: req.body.token,
      tags: req.body.tags,
      status: req.body.status,
      audienceIds: Array.isArray(req.body.audienceIds)
        ? req.body.audienceIds.map((audienceId: any) => Number(audienceId)).filter((audienceId: number) => !Number.isNaN(audienceId))
        : undefined,
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token不存在',
      });
    }

    res.json({
      success: true,
      data: token,
      message: 'Token更新成功',
    });
  } catch (error) {
    console.error('[pushAudienceController] 更新Token失败:', error);
    res.status(500).json({
      success: false,
      message: '更新推送Token失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const importPushTokens = async (req: Request, res: Response) => {
  try {
    const tokens = normalizeTokensFromBody(req);
    if (!tokens.length) {
      return res.status(400).json({
        success: false,
        message: '请提供要导入的Token列表',
      });
    }

    const result = await pushAudienceService.importTokens({
      tokens,
      replace: parseBoolean(req.body.replace),
      audienceId: req.body.audienceId ? Number(req.body.audienceId) : undefined,
    });

    res.json({
      success: true,
      data: result,
      message: 'Token导入完成',
    });
  } catch (error) {
    console.error('[pushAudienceController] 导入Token失败:', error);
    res.status(500).json({
      success: false,
      message: '导入推送Token失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const downloadPushTokenTemplate = (_req: Request, res: Response) => {
  try {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['token'],
      ['token_example_1'],
      ['token_example_2'],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tokens');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="push-token-template.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('[pushAudienceController] 下载模板失败:', error);
    res.status(500).json({
      success: false,
      message: '下载模板失败',
    });
  }
};

export const importPushTokensFromFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传Excel模板文件',
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return res.status(400).json({
        success: false,
        message: 'Excel 中没有可用数据',
      });
    }

    const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
    const tokens: string[] = [];

    rows.slice(1).forEach((row) => {
      row.forEach((cell) => {
        if (typeof cell === 'string' && cell.trim()) {
          cell
            .split(',')
            .map((token) => token.trim())
            .filter(Boolean)
            .forEach((token) => tokens.push(token));
        }
      });
    });

    const uniqueTokens = Array.from(new Set(tokens));
    if (uniqueTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel 中未找到任何 Token',
      });
    }

    const tags = parseTags(req.body.tags);
    const status = req.body.status;

    const payloadTokens: PushTokenInput[] = uniqueTokens.map((token) => ({
      token,
      tags,
      status,
    }));

    const result = await pushAudienceService.importTokens({
      tokens: payloadTokens,
      replace: parseBoolean(req.body.replace),
      audienceId: req.body.audienceId ? Number(req.body.audienceId) : undefined,
    });

    res.json({
      success: true,
      data: result,
      message: 'Token导入完成',
    });
  } catch (error) {
    console.error('[pushAudienceController] Excel导入Token失败:', error);
    res.status(500).json({
      success: false,
      message: '导入推送Token失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const parsePushTokensFromFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传Excel模板文件',
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return res.status(400).json({
        success: false,
        message: 'Excel 中没有可用数据',
      });
    }

    const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
    const tokens: string[] = [];

    rows.slice(1).forEach((row) => {
      row.forEach((cell) => {
        if (typeof cell === 'string' && cell.trim()) {
          cell
            .split(',')
            .map((token) => token.trim())
            .filter(Boolean)
            .forEach((token) => tokens.push(token));
        }
      });
    });

    const uniqueTokens = Array.from(new Set(tokens));
    if (uniqueTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel 中未找到任何 Token',
      });
    }

    res.json({
      success: true,
      data: {
        tokens: uniqueTokens,
      },
      message: 'Token解析完成',
    });
  } catch (error) {
    console.error('[pushAudienceController] Excel解析Token失败:', error);
    res.status(500).json({
      success: false,
      message: '解析推送Token失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

