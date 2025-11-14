import { Router } from 'express';
import {
  getPushTasks,
  getPushTask,
  createPushTask,
  updatePushTask,
  deletePushTask,
  executePushTask,
} from '../controllers/pushTaskController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/', getPushTasks);
router.get('/:id', getPushTask);
router.post('/', createPushTask);
router.put('/:id', updatePushTask);
router.delete('/:id', deletePushTask);
router.post('/:id/execute', executePushTask);

export default router;

