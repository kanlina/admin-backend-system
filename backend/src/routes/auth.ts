import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/authController';
import { validateLogin, validateRegister, handleValidationErrors } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// 登录专用限流器
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 20, // 限制每个IP每15分钟最多20次登录尝试
  message: {
    success: false,
    error: '登录尝试过于频繁，请稍后再试',
  },
  skipSuccessfulRequests: true, // 成功的请求不计入限制
});

// 登录
router.post('/login', loginLimiter, validateLogin, handleValidationErrors, authController.login);

// 注册
router.post('/register', validateRegister, handleValidationErrors, authController.register);

// 获取用户信息
router.get('/profile', authenticateToken, authController.getProfile);

export default router;
