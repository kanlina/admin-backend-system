import express from 'express';
import { getAllEventNames, getAttributionData, getAttributionChartData, getComparisonData } from '../controllers/attributionDataController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 获取所有事件类型
router.get('/attribution-event-names', authenticateToken, getAllEventNames);

// 获取归因数据
router.get('/attribution-data', authenticateToken, getAttributionData);

// 获取归因图表数据
router.get('/attribution-chart', authenticateToken, getAttributionChartData);

// 获取对比数据
router.get('/attribution-comparison', authenticateToken, getComparisonData);

export default router;

