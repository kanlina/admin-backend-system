import { Router } from 'express';
import multer from 'multer';
import {
  createPushAudience,
  deletePushAudience,
  deletePushToken,
  getPushAudiences,
  getPushTokens,
  downloadPushTokenTemplate,
  importPushTokens,
  importPushTokensFromFile,
  parsePushTokensFromFile,
  updatePushAudience,
  updatePushToken,
} from '../controllers/pushAudienceController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
const upload = multer();

router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/push-audiences', getPushAudiences);
router.post('/push-audiences', createPushAudience);
router.put('/push-audiences/:id', updatePushAudience);
router.delete('/push-audiences/:id', deletePushAudience);

router.get('/push-tokens', getPushTokens);
router.delete('/push-tokens/:id', deletePushToken);
router.put('/push-tokens/:id', updatePushToken);
router.post('/push-tokens/import', importPushTokens);
router.get('/push-tokens/template', downloadPushTokenTemplate);
router.post('/push-tokens/import-excel', upload.single('file'), importPushTokensFromFile);
router.post('/push-tokens/parse-excel', upload.single('file'), parsePushTokensFromFile);

export default router;

