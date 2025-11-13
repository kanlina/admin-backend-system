import { Router } from 'express';
import multer from 'multer';
import {
  getContents,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  deleteContents,
  getCategories,
  updateContentDetail,
  toggleEnabled,
  uploadContentImage
} from '../controllers/contentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// 获取分类列表（公开接口，用于前端选择）
router.get('/categories', getCategories);

// 所有其他路由都需要认证
router.use(authenticateToken);

// 上传内容图片
router.post('/upload', upload.single('file'), uploadContentImage);

// 获取内容列表
router.get('/', getContents);

// 获取单个内容详情
router.get('/:id', getContentById);

// 创建内容
router.post('/', createContent);

// 更新内容
router.put('/:id', updateContent);

// 删除内容
router.delete('/:id', deleteContent);

// 批量删除内容
router.post('/batch-delete', deleteContents);

// 更新内容详情（保存富文本）
router.post('/:id/detail', updateContentDetail);

// 切换启用状态
router.post('/:id/toggle-enabled', toggleEnabled);

export default router;

