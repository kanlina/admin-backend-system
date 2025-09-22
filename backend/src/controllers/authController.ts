import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { generateToken } from '../utils/jwt';
import { LoginRequest, RegisterRequest, ApiResponse } from '../types';

const userService = new UserService();

export class AuthController {
  async login(req: Request<{}, ApiResponse, LoginRequest>, res: Response<ApiResponse>) {
    try {
      const { username, password } = req.body;

      // 查找用户（支持用户名或邮箱登录）
      let user = await userService.getUserByUsername(username);
      if (!user) {
        user = await userService.getUserByEmail(username);
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          error: '用户名或密码错误',
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: '账户已被禁用',
        });
      }

      const isValidPassword = await userService.verifyPassword(user, password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: '用户名或密码错误',
        });
      }

      const token = generateToken(user);

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
          },
        },
        message: '登录成功',
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async register(req: Request<{}, ApiResponse, RegisterRequest>, res: Response<ApiResponse>) {
    try {
      const { username, email, password } = req.body;

      // 检查用户名是否已存在
      const existingUser = await userService.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: '用户名已存在',
        });
      }

      // 检查邮箱是否已存在
      const existingEmail = await userService.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: '邮箱已被注册',
        });
      }

      const user = await userService.createUser({ username, email, password });
      const token = generateToken(user);

      res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
          },
        },
        message: '注册成功',
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async getProfile(req: Request, res: Response<ApiResponse>) {
    try {
      const user = (req as any).user;
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }
}
