import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { UpdateUserRequest, PaginationQuery, ApiResponse } from '../types';

const userService = new UserService();

export class UserController {
  async getUsers(req: Request<{}, ApiResponse, {}, PaginationQuery>, res: Response<ApiResponse>) {
    try {
      const result = await userService.getUsers(req.query);
      
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
}
