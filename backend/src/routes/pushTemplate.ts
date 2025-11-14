import { Router } from 'express';
import {
  getPushTemplates,
  getPushTemplate,
  createPushTemplate,
  updatePushTemplate,
  deletePushTemplate,
} from '../controllers/pushTemplateController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/', getPushTemplates);
router.get('/:id', getPushTemplate);
router.post('/', createPushTemplate);
router.put('/:id', updatePushTemplate);
router.delete('/:id', deletePushTemplate);

export default router;

