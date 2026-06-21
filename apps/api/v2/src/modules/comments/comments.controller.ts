import { getCommentService } from "@ecom/features/di/containers/CommentService";
import { Body, Controller, Get, NotFoundException, Param, Post, Query } from "@nestjs/common";
import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf } from "class-validator";

class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsNumber()
  postId?: number;

  @IsOptional()
  @IsNumber()
  pageId?: number;

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsString()
  authorEmail?: string;

  @IsOptional()
  @IsNumber()
  parentId?: number;

  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ValidateIf((o: CreateCommentDto) => !o.postId && !o.pageId)
  @IsNotEmpty({ message: "Either postId or pageId is required" })
  _requireTarget?: never;
}

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

    return getCommentService().listComments({
      postId: postId ? Number(postId) : undefined,
      status: status as "pending" | "approved" | "spam" | "trash" | undefined,
      page: Number(page),
      perPage: take,
    });
  }

  @Get(":id")
  async getComment(@Param("id") id: string) {
    try {
      return await getCommentService().getComment(Number(id));
    } catch {
      throw new NotFoundException("Comment not found");
    }
  }

  @Post()
  async createComment(@Body() body: CreateCommentDto) {
    return getCommentService().createComment({
      content: body.content,
      postId: body.postId,
      pageId: body.pageId,
      authorName: body.authorName,
      authorEmail: body.authorEmail,
      parentId: body.parentId,
      customerId: body.customerId,
    });
  }
}
