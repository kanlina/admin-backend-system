import { Router } from 'express';
import {
  getPushConfigs,
  getPushConfig,
  createPushConfig,
  updatePushConfig,
  deletePushConfig,
} from '../controllers/pushConfigController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/', getPushConfigs);
router.get('/:id', getPushConfig);
router.post('/', createPushConfig);
router.put('/:id', updatePushConfig);
router.delete('/:id', deletePushConfig);

export default router;

