import { prisma } from "@ecom/prisma";
import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";

@Controller("v2/blog")
export class BlogController {
  @Get("posts")
  async listPosts(
    @Query("page") page = "1",
    @Query("perPage") perPage = "10",
    @Query("search") search?: string,
    @Query("category") categoryId?: string,
  ) {
    const take = Math.min(Number(perPage), 50);
    const skip = (Number(page) - 1) * take;

    const where: Record<string, unknown> = {
      status: "PUBLISHED",
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { excerpt: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categories = {
        some: { categoryId: Number(categoryId) },
      };
    }

    const [data, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
          publishedAt: true,
          views: true,
          author: { select: { id: true, name: true } },
          categories: {
            select: { category: { select: { id: true, name: true, slug: true } } },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        perPage: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  @Get("posts/:slug")
  async getPostBySlug(@Param("slug") slug: string) {
    const post = await prisma.post.findFirst({
      where: { slug, status: "PUBLISHED", deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        featuredImage: true,
        publishedAt: true,
        views: true,
        author: { select: { id: true, name: true } },
        categories: {
          select: { category: { select: { id: true, name: true, slug: true } } },
        },
        tags: {
          select: { tag: { select: { id: true, name: true, slug: true } } },
        },
      },
    });

    if (!post) throw new NotFoundException("Post not found");

    prisma.post
      .update({ where: { id: post.id }, data: { views: { increment: 1 } } })
      .catch(() => {});

    return post;
  }

  @Get("categories")
  async listCategories() {
    return prisma.category.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        parentId: true,
      },
    });
  }
}
