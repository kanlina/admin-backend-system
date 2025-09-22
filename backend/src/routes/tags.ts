import { Router } from 'express';
import { TagController } from '../controllers/tagController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateTag, handleValidationErrors } from '../middleware/validation';

const router = Router();
const tagController = new TagController();

// 获取所有标签（公开）
router.get('/all', tagController.getAllTags);

// 获取热门标签（公开）
router.get('/popular', tagController.getPopularTags);

// 获取标签列表（公开）
router.get('/', tagController.getTags);

// 获取单个标签（公开）
router.get('/:id', tagController.getTagById);

// 以下路由需要认证
router.use(authenticateToken);

// 创建标签（需要认证）
router.post('/', validateTag, handleValidationErrors, tagController.createTag);

// 更新标签（需要认证）
router.put('/:id', validateTag, handleValidationErrors, tagController.updateTag);

// 删除标签（仅管理员）
router.delete('/:id', requireRole(['ADMIN']), tagController.deleteTag);

export default router;
