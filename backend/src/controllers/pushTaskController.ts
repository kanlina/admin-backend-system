import { Response } from 'express';
import { pushTaskService } from '../services/pushTaskService';
import { pushAudienceService } from '../services/pushAudienceService';
import { pushTemplateService } from '../services/pushTemplateService';
import { pushConfigService } from '../services/pushConfigService';
import type { AuthenticatedRequest } from '../types';
import { fcmService } from '../services/fcmService';

const parseId = (value: any): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const getPushTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tasks = await pushTaskService.getTasks({
      status: req.query.status ? String(req.query.status) as any : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
    });
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('[pushTaskController] 获取任务失败', error);
    res.status(500).json({ success: false, message: '获取推送任务失败', error: error instanceof Error ? error.message : '未知错误' });
  }
};

export const getPushTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = await pushTaskService.getTaskById(Number(req.params.id));
    if (!task) {
      return res.status(404).json({ success: false, message: '推送任务不存在' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    console.error('[pushTaskController] 获取任务详情失败', error);
    res.status(500).json({ success: false, message: '获取推送任务失败', error: error instanceof Error ? error.message : '未知错误' });
  }
};

export const createPushTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('[pushTaskController] 开始创建推送任务', {
      name: req.body.name,
      pushTemplateId: req.body.pushTemplateId,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });

    // 验证必填字段
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ success: false, message: '任务名称为必填项' });
    }

    const pushTemplateId = parseId(req.body.pushTemplateId);
    if (!pushTemplateId) {
      return res.status(400).json({ success: false, message: '推送模版为必填项' });
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证用户无法创建任务' });
    }

    // 获取推送模版
    const template = await pushTemplateService.getTemplateById(pushTemplateId);
    if (!template) {
      return res.status(400).json({ success: false, message: '推送模版不存在或已被删除' });
    }

    // 创建任务时固定为草稿状态
    const status = 'draft';

    // 创建任务
    const task = await pushTaskService.createTask({
      name: req.body.name.trim(),
      description: req.body.description?.trim() || undefined,
      pushTemplateId,
      pushConfigId: template.pushConfigId,
      pushAudienceId: template.pushAudienceId,
      scheduleTime: new Date().toISOString(),
      status: status as any,
      createdBy: Number(req.user.id),
    });

    if (task) {
      console.log('[pushTaskController] 推送任务创建成功', {
        taskId: task.id,
        name: task.name,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({ success: true, data: task, message: '创建推送任务成功' });
  } catch (error) {
    console.error('[pushTaskController] 创建任务失败', error);
    res.status(500).json({ 
      success: false, 
      message: '创建推送任务失败', 
      error: error instanceof Error ? error.message : '未知错误' 
    });
  }
};

export const updatePushTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const nextPayload: any = {
      name: req.body.name,
      description: req.body.description,
      // 编辑时不更新状态，状态只能通过执行推送任务来改变
    };

    const pushTemplateId = parseId(req.body.pushTemplateId);
    if (pushTemplateId) {
      const template = await pushTemplateService.getTemplateById(pushTemplateId);
      if (!template) {
        return res.status(400).json({ success: false, message: '推送模版不存在或已被删除' });
      }
      nextPayload.pushTemplateId = pushTemplateId;
      nextPayload.pushConfigId = template.pushConfigId;
      nextPayload.pushAudienceId = template.pushAudienceId;
    }

    const task = await pushTaskService.updateTask(id, {
      ...nextPayload,
    });
    if (!task) {
      return res.status(404).json({ success: false, message: '推送任务不存在' });
    }
    res.json({ success: true, data: task, message: '更新推送任务成功' });
  } catch (error) {
    console.error('[pushTaskController] 更新任务失败', error);
    res.status(500).json({ success: false, message: '更新推送任务失败', error: error instanceof Error ? error.message : '未知错误' });
  }
};

export const deletePushTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await pushTaskService.deleteTask(Number(req.params.id));
    res.json({ success: true, message: '删除推送任务成功' });
  } catch (error) {
    console.error('[pushTaskController] 删除任务失败', error);
    res.status(500).json({ success: false, message: '删除推送任务失败', error: error instanceof Error ? error.message : '未知错误' });
  }
};

export const executePushTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    console.info('[pushTaskController] 即将执行推送任务', {
      taskId: id,
      operatorId: req.user?.id,
      requestedAt: new Date().toISOString(),
    });
    const task = await pushTaskService.getTaskById(id);
    if (!task) {
      console.warn('[pushTaskController] 推送任务不存在，无法执行', { taskId: id });
      return res.status(404).json({ success: false, message: '推送任务不存在' });
    }

    // 检查任务状态，已完成或失败的任务不能再次执行
    if (task.status === 'completed') {
      console.warn('[pushTaskController] 推送任务已完成，不能再次执行', { taskId: id, status: task.status });
      return res.status(400).json({ success: false, message: '推送任务已完成，不能再次执行' });
    }

    if (task.status === 'failed') {
      console.warn('[pushTaskController] 推送任务已失败，不能再次执行', { taskId: id, status: task.status });
      return res.status(400).json({ success: false, message: '推送任务已失败，不能再次执行' });
    }

    await pushTaskService.updateTaskStats(id, { status: 'processing', lastError: null });
    console.info('[pushTaskController] 任务状态更新为 processing', {
      taskId: id,
      pushTemplateId: task.pushTemplateId,
      pushAudienceId: task.pushAudienceId,
      pushConfigId: task.pushConfigId,
    });

    const template = await pushTemplateService.getTemplateById(task.pushTemplateId);
    if (!template) {
      await pushTaskService.updateTaskStats(id, {
        status: 'failed',
        lastError: '推送模版不存在',
      });
      return res.status(400).json({ success: false, message: '推送模版不存在' });
    }

    const pushConfig = await pushConfigService.getPushConfigById(task.pushConfigId);
    if (!pushConfig) {
      await pushTaskService.updateTaskStats(id, {
        status: 'failed',
        lastError: '推送配置缺失',
      });
      return res.status(400).json({ success: false, message: '推送配置缺失' });
    }

    if (!pushConfig.serverKey && !pushConfig.serviceAccount) {
      await pushTaskService.updateTaskStats(id, {
        status: 'failed',
        lastError: '推送配置未填写 Server Key 或 Service Account',
      });
      return res.status(400).json({ success: false, message: '推送配置未填写 Server Key 或 Service Account' });
    }

    // 获取有效 Token
    const tokens = await pushAudienceService.getTokens({ audienceId: task.pushAudienceId, status: 'active' });
    const tokenValues = Array.from(
      new Set(tokens.map((item) => item.token).filter((token): token is string => Boolean(token?.trim())))
    );
    console.info('[pushTaskController] 读取推送人群 Token 完成', {
      taskId: id,
      audienceId: task.pushAudienceId,
      tokenCount: tokenValues.length,
      sampleTokens: tokenValues.slice(0, 3),
    });

    if (tokenValues.length === 0) {
      await pushTaskService.updateTaskStats(id, {
        status: 'failed',
        totalTokens: 0,
        successCount: 0,
        failureCount: 0,
        lastError: '目标人群没有可用的推送Token',
      });
      return res.status(400).json({ success: false, message: '目标人群没有可用的推送Token' });
    }

    const sendResult = await fcmService.sendNotification({
      pushConfig,
      tokens: tokenValues,
      template,
    });
    const finalStatus = sendResult.failure > 0 ? 'failed' : 'completed';

    await pushTaskService.updateTaskStats(id, {
      status: finalStatus,
      totalTokens: tokenValues.length,
      successCount: sendResult.success,
      failureCount: sendResult.failure,
      lastError: sendResult.errors.length ? sendResult.errors.slice(-5).join('; ') : null,
    });
    console.info('[pushTaskController] 任务执行完成', {
      taskId: id,
      totalTokens: tokenValues.length,
      successCount: sendResult.success,
      failureCount: sendResult.failure,
      completedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: finalStatus === 'completed' ? '推送任务已执行' : '推送任务执行完成，但存在失败的Token',
      data: await pushTaskService.getTaskById(id),
    });
  } catch (error) {
    console.error('[pushTaskController] 执行任务失败', error);
    const id = Number(req.params.id);
    await pushTaskService.updateTaskStats(id, { status: 'failed', lastError: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ success: false, message: '执行推送任务失败', error: error instanceof Error ? error.message : '未知错误' });
  }
};

