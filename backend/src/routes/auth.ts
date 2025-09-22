import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateLogin, validateRegister, handleValidationErrors } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// 登录
router.post('/login', validateLogin, handleValidationErrors, authController.login);

// 注册
router.post('/register', validateRegister, handleValidationErrors, authController.register);

// 获取用户信息
router.get('/profile', authenticateToken, authController.getProfile);

export default router;
