import { CommentRepository } from "@ecom/features/comment/repositories/CommentRepository";
import { CommentService } from "@ecom/features/comment/services/CommentService";
import { prisma } from "@ecom/prisma";

let _commentRepository: CommentRepository | null = null;
let _commentService: CommentService | null = null;

export function getCommentRepository(): CommentRepository {
  if (!_commentRepository) {
    _commentRepository = new CommentRepository(prisma);
  }
  return _commentRepository;
}

export function getCommentService(): CommentService {
  if (!_commentService) {
    _commentService = new CommentService({
      commentRepo: getCommentRepository(),
    });
  }
  return _commentService;
}

export function resetCommentContainers(): void {
  _commentRepository = null;
  _commentService = null;
}
