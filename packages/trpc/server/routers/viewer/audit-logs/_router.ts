import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  deleteAuditLog,
  getAuditLog,
  getAuditStats,
  listAuditLogs,
  purgeAllAuditLogs,
  purgeAuditLogs,
} from "./procedures/audit-logs.handler";

export const auditLogsRouter = router({
  list: listAuditLogs,
  get: getAuditLog,
  stats: getAuditStats,
  delete: deleteAuditLog,
  purgeAll: purgeAllAuditLogs,
  purge: purgeAuditLogs,
});
