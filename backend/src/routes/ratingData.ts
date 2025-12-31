import express from 'express';
import { getRatingData } from '../controllers/ratingDataController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/rating-data', authenticateToken, getRatingData);

export default router;
