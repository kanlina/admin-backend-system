import express from 'express';
import { getInternalTransferData, getInternalTransferChartData, getInternalTransferDetails } from '../controllers/internalTransferController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 获取内转数据
router.get('/internal-transfer-data', authenticateToken, getInternalTransferData);

// 获取内转图表数据
router.get('/internal-transfer-chart', authenticateToken, getInternalTransferChartData);

// 获取内转详细数据
router.get('/internal-transfer-details', authenticateToken, getInternalTransferDetails);

export default router;
