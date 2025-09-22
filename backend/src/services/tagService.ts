import { PrismaClient, Tag } from '@prisma/client';
import { CreateTagRequest, PaginationQuery } from '../types';

const prisma = new PrismaClient();

export class TagService {
  async createTag(data: CreateTagRequest): Promise<Tag> {
    return prisma.tag.create({
      data,
    });
  }

  async getTagById(id: string): Promise<Tag | null> {
    return prisma.tag.findUnique({
      where: { id },
      include: {
        posts: {
          include: {
            post: {
              select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });
  }

  async getTagByName(name: string): Promise<Tag | null> {
    return prisma.tag.findUnique({
      where: { name },
    });
  }

  async updateTag(id: string, data: Partial<CreateTagRequest>): Promise<Tag> {
    return prisma.tag.update({
      where: { id },
      data,
    });
  }

  async deleteTag(id: string): Promise<Tag> {
    return prisma.tag.delete({
      where: { id },
    });
  }

  async getTags(query: PaginationQuery) {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          name: { contains: search },
        }
      : {};

    const [tags, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              posts: true,
            },
          },
        },
      }),
      prisma.tag.count({ where }),
    ]);

    return {
      tags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllTags(): Promise<Tag[]> {
    return prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });
  }

  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    return prisma.tag.findMany({
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
      take: limit,
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });
  }
}
