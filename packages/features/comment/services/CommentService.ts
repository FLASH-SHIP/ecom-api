import type { CommentRepository } from "@ecom/features/comment/repositories/CommentRepository";
import { ErrorWithCode } from "@ecom/lib/errors";
import { createLogger } from "@ecom/lib/logger";

const log = createLogger("CommentService");

export interface ICommentServiceDeps {
  commentRepo: CommentRepository;
}

type CommentStatus = "pending" | "approved" | "spam" | "trash";

export class CommentService {
  private deps: ICommentServiceDeps;
  constructor(deps: ICommentServiceDeps) {
    this.deps = deps;
  }

  async listComments(options: {
    postId?: number;
    pageId?: number;
    status?: CommentStatus;
    page?: number;
    perPage?: number;
  }) {
    return this.deps.commentRepo.findMany(options);
  }

  async getComment(id: number) {
    const comment = await this.deps.commentRepo.findById(id);
    if (!comment) throw ErrorWithCode.Factory.NotFound("Comment not found");
    return comment;
  }

  async getThreadedComments(postId: number) {
    return this.deps.commentRepo.findThreaded(postId);
  }

  async createComment(data: {
    content: string;
    authorName?: string;
    authorEmail?: string;
    memberId?: number;
    postId?: number;
    pageId?: number;
    parentId?: number;
    ipAddress?: string;
  }) {
    log.info("New comment submitted", {
      postId: data.postId,
      pageId: data.pageId,
      authorName: data.authorName,
    });

    return this.deps.commentRepo.create({
      ...data,
      status: "pending",
    });
  }

  async approve(id: number) {
    const comment = await this.deps.commentRepo.findById(id);
    if (!comment) throw ErrorWithCode.Factory.NotFound("Comment not found");

    log.info("Comment approved", { commentId: id });
    return this.deps.commentRepo.updateStatus(id, "approved");
  }

  async markSpam(id: number) {
    const comment = await this.deps.commentRepo.findById(id);
    if (!comment) throw ErrorWithCode.Factory.NotFound("Comment not found");
    return this.deps.commentRepo.updateStatus(id, "spam");
  }

  async trash(id: number) {
    const comment = await this.deps.commentRepo.findById(id);
    if (!comment) throw ErrorWithCode.Factory.NotFound("Comment not found");
    return this.deps.commentRepo.updateStatus(id, "trash");
  }

  async deleteComment(id: number) {
    const comment = await this.deps.commentRepo.findById(id);
    if (!comment) throw ErrorWithCode.Factory.NotFound("Comment not found");
    return this.deps.commentRepo.remove(id);
  }

  async getStatusCounts() {
    return this.deps.commentRepo.countByStatus();
  }
}
