import { Request, Response } from 'express';
import { adjustDataService } from '../services/adjustDataService';
import { appsflyerDataService } from '../services/appsflyerDataService';

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
    
    const eventNames = dataSource === 'adjust' 
      ? await adjustDataService.getAllEventNames()
      : await appsflyerDataService.getAllEventNames();

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
    const { startDate, endDate, page = 1, pageSize = 10, dataSource = 'adjust', appId, mediaSource, adSequence, adPairs, mediasWithoutAd } = req.query;
    
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
      mediasWithoutAd
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
          mediasWithoutAd as string
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
    const { startDate, endDate, dataSource = 'adjust', appId, mediaSource, adSequence, adPairs, mediasWithoutAd } = req.query;
    
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
          mediasWithoutAd as string
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
