import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// 所有用户相关路由都需要认证
router.use(authenticateToken);

// 获取用户列表（管理员）
router.get('/', requireRole(['ADMIN']), userController.getUsers);

// 获取用户统计信息（管理员）
router.get('/stats', requireRole(['ADMIN']), userController.getUserStats);

// 获取单个用户信息
router.get('/:id', userController.getUserById);

// 更新用户信息（管理员或用户本人）
router.put('/:id', (req, res, next) => {
  const currentUser = (req as any).user;
  const targetUserId = req.params.id;
  
  // 管理员可以更新任何用户，普通用户只能更新自己
  if (currentUser.role === 'ADMIN' || currentUser.id === targetUserId) {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: '权限不足',
    });
  }
}, userController.updateUser);

// 删除用户（仅管理员）
router.delete('/:id', requireRole(['ADMIN']), userController.deleteUser);

export default router;
