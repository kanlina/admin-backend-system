import { Request, Response } from 'express';
import { internalTransferService } from '../services/internalTransferService_fixed';

export const getInternalTransferData = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, page = 1, pageSize = 10 } = req.query;
    
    const result = await internalTransferService.getInternalTransferData(
      startDate as string,
      endDate as string,
      parseInt(page as string),
      parseInt(pageSize as string)
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: '数据获取成功'
    });
  } catch (error) {
    console.error('获取内转数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

export const getInternalTransferChartData = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const data = await internalTransferService.getInternalTransferChartData(
      startDate as string,
      endDate as string
    );

    res.json({
      success: true,
      data: data,
      message: '图表数据获取成功'
    });
  } catch (error) {
    console.error('获取内转图表数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取图表数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

export const getInternalTransferDetails = async (req: Request, res: Response) => {
  try {
    const { date, type } = req.query;

    if (!date || !type) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：date 和 type'
      });
    }

    const data = await internalTransferService.getInternalTransferDetails(
      date as string,
      type as string
    );

    res.json({
      success: true,
      data: data,
      message: '详细数据获取成功'
    });
  } catch (error) {
    console.error('获取内转详细数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取详细数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};