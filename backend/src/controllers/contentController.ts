import { Request, Response } from 'express';
import { contentService } from '../services/contentService';
import type { AuthenticatedRequest } from '../types';

// 获取内容列表
export const getContents = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      title,
      enabled,
      appId = 15, // 默认 appId
      type,
      parentId
    } = req.query;

    const result = await contentService.getContents({
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      title: title as string,
      enabled: enabled !== undefined ? parseInt(enabled as string) : undefined,
      appId: parseInt(appId as string),
      type: type !== undefined ? parseInt(type as string) : undefined,
      parentId: parentId !== undefined ? parseInt(parentId as string) : undefined
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: '获取内容列表成功'
    });
  } catch (error) {
    console.error('获取内容列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取内容列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 获取单个内容详情
export const getContentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const content = await contentService.getContentById(parseInt(id));

    if (!content) {
      return res.status(404).json({
        success: false,
        message: '内容不存在'
      });
    }

    res.json({
      success: true,
      data: content,
      message: '获取内容详情成功'
    });
  } catch (error) {
    console.error('获取内容详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取内容详情失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 创建内容
export const createContent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contentData = req.body;
    const content = await contentService.createContent(contentData);

    res.json({
      success: true,
      data: content,
      message: '创建内容成功'
    });
  } catch (error) {
    console.error('创建内容失败:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : '创建内容失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 更新内容
export const updateContent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const contentData = req.body;
    const content = await contentService.updateContent(parseInt(id), contentData);

    res.json({
      success: true,
      data: content,
      message: '更新内容成功'
    });
  } catch (error) {
    console.error('更新内容失败:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : '更新内容失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 删除内容
export const deleteContent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await contentService.deleteContent(parseInt(id));

    res.json({
      success: true,
      message: '删除内容成功'
    });
  } catch (error) {
    console.error('删除内容失败:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : '删除内容失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 批量删除内容
export const deleteContents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的内容ID列表'
      });
    }

    await contentService.deleteContents(ids.map(id => parseInt(id)));

    res.json({
      success: true,
      message: '批量删除内容成功'
    });
  } catch (error) {
    console.error('批量删除内容失败:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : '批量删除内容失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 获取分类列表
export const getCategories = async (req: Request, res: Response) => {
  try {
    const { appId = 15 } = req.query;
    const categories = await contentService.getCategories(parseInt(appId as string));

    type CategoryItem = { id: number; name: string; parentId: number };
    interface CategoryTreeNode extends CategoryItem {
      children: CategoryTreeNode[];
    }

    const buildTree = (
      items: CategoryItem[],
      parentId: number = 0,
    ): CategoryTreeNode[] =>
      items
        .filter(item => item.parentId === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id),
        }));

    const tree = buildTree(categories);

    res.json({
      success: true,
      data: tree,
      message: '获取分类列表成功'
    });
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 更新内容详情（保存富文本内容）
export const updateContentDetail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '内容不能为空'
      });
    }

    const updatedContent = await contentService.updateContentDetail(parseInt(id), content);

    res.json({
      success: true,
      data: updatedContent,
      message: '保存内容详情成功'
    });
  } catch (error) {
    console.error('保存内容详情失败:', error);
    res.status(500).json({
      success: false,
      message: '保存内容详情失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 切换启用状态
export const toggleEnabled = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        message: '请提供启用状态'
      });
    }

    const content = await contentService.toggleEnabled(parseInt(id), parseInt(enabled));

    res.json({
      success: true,
      data: content,
      message: '更新状态成功'
    });
  } catch (error) {
    console.error('更新状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新状态失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

