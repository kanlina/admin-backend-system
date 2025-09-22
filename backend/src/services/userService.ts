import { PrismaClient, User } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/password';
import { RegisterRequest, UpdateUserRequest, PaginationQuery } from '../types';

const prisma = new PrismaClient();

export class UserService {
  async createUser(data: RegisterRequest): Promise<User> {
    const hashedPassword = await hashPassword(data.password);
    
    return prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
      },
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        posts: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            posts: true,
            comments: true,
          },
        },
      },
    });
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return comparePassword(password, user.password);
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async deleteUser(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }

  async getUsers(query: PaginationQuery) {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { username: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          avatar: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              posts: true,
              comments: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserStats() {
    const [totalUsers, activeUsers, adminUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      adminUsers,
      inactiveUsers: totalUsers - activeUsers,
    };
  }
}
