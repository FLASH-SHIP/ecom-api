import { getCommentService } from "@ecom/features/di/containers/CommentService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

const statusEnum = z.enum(["pending", "approved", "spam", "trash"]);

export const listComments = authedProcedure
  .use(requirePermission(Permissions.COMMENTS_READ))
  .input(
    z.object({
      postId: z.number().int().positive().optional(),
      pageId: z.number().int().positive().optional(),
      status: statusEnum.optional(),
      page: z.number().int().positive().optional(),
      perPage: z.number().int().min(1).max(500).optional(),
    }),
  )
  .query(async ({ input }) => {
    const svc = getCommentService();
    return svc.listComments(input);
  });

export const getComment = authedProcedure
  .use(requirePermission(Permissions.COMMENTS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const svc = getCommentService();
    return svc.getComment(input.id);
  });

export const statusCounts = authedProcedure
  .use(requirePermission(Permissions.COMMENTS_READ))
  .query(async () => {
    const svc = getCommentService();
    return svc.getStatusCounts();
  });

export const approve = authedProcedure
  .use(requirePermission(Permissions.COMMENTS_MODERATE))
  .use(auditLog({ module: "comments", action: "APPROVE", entityType: "Comment" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const svc = getCommentService();
    return svc.approve(input.id);
  });

export const markSpam = authedProcedure
  .use(requirePermission(Permissions.COMMENTS_MODERATE))
  .use(auditLog({ module: "comments", action: "SPAM", entityType: "Comment" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const svc = getCommentService();
    return svc.markSpam(input.id);
  });

export const trash = authedProcedure
  .use(requirePermission(Permissions.COMMENTS_MODERATE))
  .use(auditLog({ module: "comments", action: "TRASH", entityType: "Comment" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const svc = getCommentService();
    return svc.trash(input.id);
  });

export const deleteComment = authedProcedure
  .use(requirePermission(Permissions.COMMENTS_DELETE))
  .use(auditLog({ module: "comments", action: "DELETE", entityType: "Comment" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const svc = getCommentService();
    return svc.deleteComment(input.id);
  });
