import express from 'express';
import { getAllAppNames, getAllMediaSources, getAllEventNames, getAttributionData, getAttributionChartData, getComparisonData } from '../controllers/attributionDataController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 获取所有 app_name
router.get('/attribution-app-names', authenticateToken, getAllAppNames);

// 获取所有 media_source
router.get('/attribution-media-sources', authenticateToken, getAllMediaSources);

// 获取所有事件类型
router.get('/attribution-event-names', authenticateToken, getAllEventNames);

// 获取归因数据
router.get('/attribution-data', authenticateToken, getAttributionData);

// 获取归因图表数据
router.get('/attribution-chart', authenticateToken, getAttributionChartData);

// 获取对比数据
router.get('/attribution-comparison', authenticateToken, getComparisonData);

export default router;

