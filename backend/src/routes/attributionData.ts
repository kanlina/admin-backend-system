import express from 'express';
import {
  getAllAppNames,
  getAllMediaSources,
  getAllAdSequences,
  getAllEventNames,
  getAttributionData,
  getAttributionChartData,
  getComparisonData,
  getAttributionDetails,
  getFavoriteAdSequences,
  toggleFavoriteAdSequence,
} from '../controllers/attributionDataController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 获取所有 app_id（复用原控制器getAllAppNames逻辑后续可替换）
router.get('/attribution-app-ids', authenticateToken, getAllAppNames);

// 获取所有 media_source
router.get('/attribution-media-sources', authenticateToken, getAllMediaSources);

// 获取所有 广告序列 (af_c_id)
router.get('/attribution-ad-sequences', authenticateToken, getAllAdSequences);

// 获取所有事件类型
router.get('/attribution-event-names', authenticateToken, getAllEventNames);

// 获取归因数据
router.get('/attribution-data', authenticateToken, getAttributionData);

// 获取归因图表数据
router.get('/attribution-chart', authenticateToken, getAttributionChartData);

// 获取归因明细
router.get('/attribution-details', authenticateToken, getAttributionDetails);

// 获取对比数据
router.get('/attribution-comparison', authenticateToken, getComparisonData);

// 收藏广告序列
router.get('/attribution-favorites', authenticateToken, getFavoriteAdSequences);
router.post('/attribution-favorites', authenticateToken, toggleFavoriteAdSequence);

export default router;

