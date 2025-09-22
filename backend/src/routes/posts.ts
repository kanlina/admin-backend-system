import { Router } from 'express';
import { PostController } from '../controllers/postController';
import { authenticateToken } from '../middleware/auth';
import { validatePost, handleValidationErrors } from '../middleware/validation';

const router = Router();
const postController = new PostController();

// 获取文章列表（公开）
router.get('/', postController.getPosts);

// 获取文章统计信息（需要认证）
router.get('/stats', authenticateToken, postController.getPostStats);

// 获取单个文章（公开）
router.get('/:id', postController.getPostById);

// 以下路由需要认证
router.use(authenticateToken);

// 创建文章
router.post('/', validatePost, handleValidationErrors, postController.createPost);

// 更新文章
router.put('/:id', validatePost, handleValidationErrors, postController.updatePost);

// 删除文章
router.delete('/:id', postController.deletePost);

export default router;
