import { Request, Response } from 'express';
import { ratingDataService } from '../services/ratingDataService';

export const getRatingData = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await ratingDataService.getRatingData(
      startDate as string | undefined,
      endDate as string | undefined
    );

    res.json({
      success: true,
      data,
      message: '数据获取成功',
    });
  } catch (error) {
    console.error('获取评分数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};
