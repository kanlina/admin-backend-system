import { Request, Response } from 'express';
import { internalTransferService } from '../services/internalTransferService';

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