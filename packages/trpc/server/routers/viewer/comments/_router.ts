import { router } from "../../../trpc";
import {
  approve,
  deleteComment,
  getComment,
  listComments,
  markSpam,
  statusCounts,
  trash,
} from "./procedures/comments.handler";

export const commentsRouter = router({
  list: listComments,
  get: getComment,
  statusCounts,
  approve,
  markSpam,
  trash,
  delete: deleteComment,
});
