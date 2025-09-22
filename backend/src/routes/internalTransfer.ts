import express from 'express';
import { getInternalTransferData } from '../controllers/internalTransferController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 获取内转数据
router.get('/internal-transfer-data', authenticateToken, getInternalTransferData);

export default router;
