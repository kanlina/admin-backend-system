import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { UpdateUserRequest, PaginationQuery, ApiResponse, RegisterRequest } from '../types';

const userService = new UserService();

export class UserController {
  async getUsers(req: Request<{}, ApiResponse, {}, any>, res: Response<ApiResponse>) {
    try {
      // 转换查询参数类型
      const query: PaginationQuery = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };
      
      const result = await userService.getUsers(query);
      
      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async getUserById(req: Request<{ id: string }>, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: '用户不存在',
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async updateUser(req: Request<{ id: string }, ApiResponse, UpdateUserRequest>, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const user = await userService.updateUser(id, updateData);

      res.json({
        success: true,
        data: user,
        message: '用户信息更新成功',
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async deleteUser(req: Request<{ id: string }>, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;

      // 不能删除自己
      if (currentUser.id === id) {
        return res.status(400).json({
          success: false,
          error: '不能删除自己的账户',
        });
      }

      await userService.deleteUser(id);

      res.json({
        success: true,
        message: '用户删除成功',
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async getUserStats(req: Request, res: Response<ApiResponse>) {
    try {
      const stats = await userService.getUserStats();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async createUser(req: Request<{}, ApiResponse, RegisterRequest>, res: Response<ApiResponse>) {
    try {
      const { username, email, password, role } = req.body;

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
          error: '邮箱已被使用',
        });
      }

      // 如果没有提供密码，使用默认密码123456
      const userPassword = password || '123456';

      const user = await userService.createUser({
        username,
        email,
        password: userPassword,
        role: role || 'USER',
      });

      // 不返回密码
      const { password: _, ...userWithoutPassword } = user;

      res.status(201).json({
        success: true,
        data: userWithoutPassword,
        message: '用户创建成功',
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async resetPassword(req: Request<{ id: string }, ApiResponse, { password: string }>, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { password } = req.body;

      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          error: '密码长度至少为6个字符',
        });
      }

      await userService.resetPassword(id, password);

      res.json({
        success: true,
        message: '密码重置成功',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }
}
