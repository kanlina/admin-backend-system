import { PrismaClient, Post } from '@prisma/client';
import { CreatePostRequest, UpdatePostRequest, PaginationQuery } from '../types';

const prisma = new PrismaClient();

export class PostService {
  async createPost(authorId: string, data: CreatePostRequest): Promise<Post> {
    const { tagIds, ...postData } = data;
    
    return prisma.post.create({
      data: {
        ...postData,
        authorId,
        tags: tagIds ? {
          create: tagIds.map(tagId => ({
            tag: { connect: { id: tagId } }
          }))
        } : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  async getPostById(id: string): Promise<Post | null> {
    return prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async updatePost(id: string, data: UpdatePostRequest): Promise<Post> {
    const { tagIds, ...postData } = data;
    
    // 如果提供了 tagIds，先删除现有关联，再创建新的
    if (tagIds !== undefined) {
      await prisma.postTag.deleteMany({
        where: { postId: id },
      });
    }

    return prisma.post.update({
      where: { id },
      data: {
        ...postData,
        tags: tagIds ? {
          create: tagIds.map(tagId => ({
            tag: { connect: { id: tagId } }
          }))
        } : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  async deletePost(id: string): Promise<Post> {
    return prisma.post.delete({
      where: { id },
    });
  }

  async getPosts(query: PaginationQuery & { status?: string; authorId?: string }) {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      status,
      authorId 
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    if (authorId) {
      where.authorId = authorId;
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async incrementViews(id: string): Promise<Post> {
    return prisma.post.update({
      where: { id },
      data: {
        views: {
          increment: 1,
        },
      },
    });
  }

  async getPostStats() {
    const [totalPosts, publishedPosts, draftPosts, totalViews] = await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { status: 'PUBLISHED' } }),
      prisma.post.count({ where: { status: 'DRAFT' } }),
      prisma.post.aggregate({
        _sum: { views: true },
      }),
    ]);

    return {
      totalPosts,
      publishedPosts,
      draftPosts,
      archivedPosts: totalPosts - publishedPosts - draftPosts,
      totalViews: totalViews._sum.views || 0,
    };
  }
}
