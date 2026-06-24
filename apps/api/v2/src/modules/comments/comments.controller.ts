import { getCommentService } from "@ecom/features/di/containers/CommentService";
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import type { CreateCommentDto } from "./dto/create-comment.dto";
import type { ListCommentsQueryDto } from "./dto/list-comments-query.dto";

@Controller("comments")
export class CommentsController {
  @Get()
  async listComments(@Query() query: ListCommentsQueryDto) {
    const result = await getCommentService().listComments({
      postId: query.postId,
      status: query.status,
      page: query.page,
      perPage: query.perPage,
    });

    return {
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        perPage: result.perPage,
        totalPages: Math.ceil(result.total / result.perPage),
      },
    };
  }

  @Get(":id")
  async getComment(@Param("id") id: string) {
    const comment = await getCommentService().getComment(Number(id));
    return {
      data: comment,
    };
  }

  @Post()
  async createComment(@Body() body: CreateCommentDto) {
    const comment = await getCommentService().createComment({
      content: body.content,
      postId: body.postId,
      pageId: body.pageId,
      authorName: body.authorName,
      authorEmail: body.authorEmail,
      parentId: body.parentId,
      customerId: body.customerId,
    });

    return {
      data: comment,
    };
  }
}
