import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  assignTo,
  deleteSubmission,
  getSubmission,
  listSubmissions,
  markReplied,
  statusCounts,
  updateStatus,
} from "./procedures/contacts.handler";

export const contactsRouter = router({
  list: listSubmissions,
  get: getSubmission,
  statusCounts,
  updateStatus,
  assignTo,
  markReplied,
  delete: deleteSubmission,
});
