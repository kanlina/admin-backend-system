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
    const skip = (page - 1) * Number(limit);
    const limitNum = Number(limit);

    const where = search
      ? {
          name: { contains: search },
        }
      : {};

    const [tags, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.tag.count({ where }),
    ]);

    return {
      tags,
      pagination: {
        page,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getAllTags(): Promise<Tag[]> {
    return prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    return prisma.tag.findMany({
      orderBy: { name: 'asc' },
      take: limit,
    });
  }
}
