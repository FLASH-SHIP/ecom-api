import { prisma } from "@ecom/prisma";
import { Body, Controller, Get, NotFoundException, Param, Post, Query } from "@nestjs/common";

@Controller("v2/comments")
export class CommentsController {
  @Get()
  async listComments(
    @Query("postId") postId?: string,
    @Query("status") status?: string,
    @Query("page") page = "1",
    @Query("perPage") perPage = "20",
  ) {
    const take = Math.min(Number(perPage), 50);
    const skip = (Number(page) - 1) * take;

    const where: Record<string, unknown> = {};
    if (postId) where.postId = Number(postId);
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          content: true,
          authorName: true,
          authorEmail: true,
          status: true,
          parentId: true,
          createdAt: true,
          postId: true,
          pageId: true,
        },
      }),
      prisma.comment.count({ where }),
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

  @Get(":id")
  async getComment(@Param("id") id: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        content: true,
        authorName: true,
        authorEmail: true,
        status: true,
        parentId: true,
        createdAt: true,
        postId: true,
        pageId: true,
        replies: {
          select: {
            id: true,
            content: true,
            authorName: true,
            createdAt: true,
          },
        },
      },
    });

    if (!comment) throw new NotFoundException("Comment not found");
    return comment;
  }

  @Post()
  async createComment(
    @Body()
    body: {
      content: string;
      postId?: number;
      pageId?: number;
      authorName?: string;
      authorEmail?: string;
      parentId?: number;
      memberId?: number;
    },
  ) {
    return prisma.comment.create({
      data: {
        content: body.content,
        postId: body.postId,
        pageId: body.pageId,
        authorName: body.authorName,
        authorEmail: body.authorEmail,
        parentId: body.parentId,
        memberId: body.memberId,
        status: "pending",
      },
      select: {
        id: true,
        content: true,
        authorName: true,
        status: true,
        createdAt: true,
      },
    });
  }
}
