import { Request, Response } from 'express';
import { adjustDataService } from '../services/adjustDataService';
import { appsflyerDataService } from '../services/appsflyerDataService';
import { userPreferenceService } from '../services/userPreferenceService';
import type { AuthenticatedRequest } from '../types';

// 获取所有 app_id
export const getAllAppNames = async (req: Request, res: Response) => {
  try {
    const appIds = await appsflyerDataService.getAllAppIds();

    res.json({
      success: true,
      data: appIds,
      message: '获取 app_id 列表成功'
    });
  } catch (error) {
    console.error('获取 app_id 列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取 app_id 列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 获取所有 media_source
export const getAllMediaSources = async (req: Request, res: Response) => {
  try {
    const mediaSources = await appsflyerDataService.getAllMediaSources();

    res.json({
      success: true,
      data: mediaSources,
      message: '获取 media_source 列表成功'
    });
  } catch (error) {
    console.error('获取 media_source 列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取 media_source 列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 获取所有 ad_sequence (af_c_id)
export const getAllAdSequences = async (req: Request, res: Response) => {
  try {
    const { mediaSource } = req.query;
    const sequences = await appsflyerDataService.getAllAdSequences(mediaSource as string);

    res.json({
      success: true,
      data: sequences,
      message: '获取广告序列列表成功'
    });
  } catch (error) {
    console.error('获取广告序列列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取广告序列列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 获取所有可用的事件类型
export const getAllEventNames = async (req: Request, res: Response) => {
  try {
    const { dataSource = 'adjust' } = req.query;

    console.log('========================================');
    console.log('📋 [事件列表] 收到请求, 数据源:', dataSource);
    
    const eventNames = await adjustDataService.getAllEventNames();

    console.log('✅ [事件列表] 查询成功, 事件数量:', eventNames.length);
    console.log('事件列表:', eventNames);
    console.log('========================================\n');

    res.json({
      success: true,
      data: eventNames,
      message: '获取事件类型列表成功'
    });
  } catch (error) {
    console.error('❌ [事件列表] 获取失败:', error);
    console.log('========================================\n');
    res.status(500).json({
      success: false,
      message: '获取事件类型列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

export const getAttributionData = async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      page = 1,
      pageSize = 10,
      dataSource = 'adjust',
      appId,
      mediaSource,
      adSequence,
      adPairs,
      mediasWithoutAd,
      reloanStatus,
    } = req.query;
    
    console.log('========================================');
    console.log('📊 [归因数据] 收到请求');
    console.log('请求参数:', {
      startDate,
      endDate,
      page,
      pageSize,
      dataSource,
      appId,
      mediaSource,
      adSequence,
      adPairs,
      mediasWithoutAd,
      reloanStatus,
    });
    
    const result = dataSource === 'adjust'
      ? await adjustDataService.getAdjustData(
          startDate as string,
          endDate as string,
          parseInt(page as string),
          parseInt(pageSize as string)
        )
      : await appsflyerDataService.getAppsflyerData(
          startDate as string,
          endDate as string,
          parseInt(page as string),
          parseInt(pageSize as string),
          appId as string,
          mediaSource as string,
          adSequence as string,
          undefined,
          adPairs as string,
          mediasWithoutAd as string,
          reloanStatus as string
        );

    console.log('✅ [归因数据] 查询成功');
    console.log('返回数据:', {
      dataLength: Array.isArray(result.data) ? result.data.length : 0,
      eventNamesCount: Array.isArray(result.eventNames) ? result.eventNames.length : 0,
      eventNames: result.eventNames,
      pagination: result.pagination,
      firstRecord: Array.isArray(result.data) && result.data.length > 0 ? result.data[0] : null
    });
    console.log('========================================\n');

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      eventNames: result.eventNames,
      message: '归因数据获取成功'
    });
  } catch (error) {
    console.error('❌ [归因数据] 获取失败:', error);
    console.error('错误堆栈:', error instanceof Error ? error.stack : '无堆栈信息');
    console.log('========================================\n');
    res.status(500).json({
      success: false,
      message: '获取归因数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

export const getAttributionChartData = async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      dataSource = 'adjust',
      appId,
      mediaSource,
      adSequence,
      adPairs,
      mediasWithoutAd,
      reloanStatus,
    } = req.query;
    
    const result = dataSource === 'adjust'
      ? await adjustDataService.getAdjustChartData(
          startDate as string,
          endDate as string
        )
      : await appsflyerDataService.getAppsflyerChartData(
          startDate as string,
          endDate as string,
          appId as string,
          mediaSource as string,
          adSequence as string,
          undefined,
          adPairs as string,
          mediasWithoutAd as string,
          reloanStatus as string
        );

    res.json({
      success: true,
      data: result.data,
      eventNames: result.eventNames,
      message: '归因图表数据获取成功'
    });
  } catch (error) {
    console.error('获取归因图表数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取归因图表数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 获取对比数据（同时查询两个数据源）
export const getComparisonData = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, page = 1, pageSize = 10 } = req.query;
    
    // 并行获取两个数据源的数据
    const [adjustResult, appsflyerResult] = await Promise.all([
      adjustDataService.getAdjustData(
        startDate as string,
        endDate as string,
        parseInt(page as string),
        parseInt(pageSize as string)
      ),
      appsflyerDataService.getAppsflyerData(
        startDate as string,
        endDate as string,
        parseInt(page as string),
        parseInt(pageSize as string)
      )
    ]);

    res.json({
      success: true,
      data: {
        adjust: adjustResult.data,
        appsflyer: appsflyerResult.data
      },
      pagination: adjustResult.pagination, // 使用相同的分页
      eventNames: {
        adjust: adjustResult.eventNames,
        appsflyer: appsflyerResult.eventNames
      },
      message: '对比数据获取成功'
    });
  } catch (error) {
    console.error('获取对比数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取对比数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

export const getAttributionDetails = async (req: Request, res: Response) => {
  try {
    const {
      date,
      page = 1,
      pageSize = 10,
      dataSource = 'appsflyer',
      appId,
      mediaSource,
      adSequence,
      reloanStatus,
    } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：date',
      });
    }

    if (dataSource !== 'appsflyer') {
      return res.status(400).json({
        success: false,
        message: '当前仅支持 AppsFlyer 数据源的归因明细',
      });
    }

    const result = await appsflyerDataService.getAppsflyerDetails(
      date as string,
      parseInt(page as string),
      parseInt(pageSize as string),
      appId as string,
      mediaSource as string,
      adSequence as string,
      reloanStatus as string
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: '归因明细获取成功',
    });
  } catch (error) {
    console.error('获取归因明细失败:', error);
    res.status(500).json({
      success: false,
      message: '获取归因明细失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const getFavoriteAdSequences = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const favorites = await userPreferenceService.getFavoriteAdSequences(req.user.id);
    res.json({
      success: true,
      data: favorites,
      message: '获取收藏广告序列成功',
    });
  } catch (error) {
    console.error('获取收藏广告序列失败:', error);
    res.status(500).json({
      success: false,
      message: '获取收藏广告序列失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export const toggleFavoriteAdSequence = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { mediaSource, adSequence } = req.body || {};
    if (!mediaSource || !adSequence) {
      return res.status(400).json({
        success: false,
        message: '媒体渠道和广告序列不能为空',
      });
    }

    const result = await userPreferenceService.toggleFavoriteAdSequence(
      req.user.id,
      String(mediaSource),
      String(adSequence),
    );

    res.json({
      success: true,
      data: {
        favorites: result.favorites,
        added: result.added,
        mediaSource: mediaSource,
        adSequence: adSequence,
      },
      message: result.added ? '收藏成功' : '取消收藏成功',
    });
  } catch (error) {
    console.error('更新收藏广告序列失败:', error);
    res.status(500).json({
      success: false,
      message: '更新收藏广告序列失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};
