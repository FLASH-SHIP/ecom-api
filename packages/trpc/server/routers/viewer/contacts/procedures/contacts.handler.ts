import { getContactService } from "@ecom/features/di/containers/ContactService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

const statusEnum = z.enum(["new", "read", "replied", "archived"]);

export const listSubmissions = authedProcedure
  .use(requirePermission(Permissions.CONTACTS_READ))
  .input(
    z.object({
      formSlug: z.string().optional(),
      status: statusEnum.optional(),
      page: z.number().int().positive().optional(),
      perPage: z.number().int().min(1).max(500).optional(),
    }),
  )
  .query(async ({ input }) => {
    const svc = getContactService();
    return svc.listSubmissions(input);
  });

export const getSubmission = authedProcedure
  .use(requirePermission(Permissions.CONTACTS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const svc = getContactService();
    return svc.getSubmission(input.id);
  });

export const statusCounts = authedProcedure
  .use(requirePermission(Permissions.CONTACTS_READ))
  .query(async () => {
    const svc = getContactService();
    return svc.getStatusCounts();
  });

export const updateStatus = authedProcedure
  .use(requirePermission(Permissions.CONTACTS_MANAGE))
  .use(auditLog({ module: "contacts", action: "UPDATE_STATUS", entityType: "ContactSubmission" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      status: statusEnum,
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getContactService();
    return svc.updateStatus(input.id, input.status);
  });

export const assignTo = authedProcedure
  .use(requirePermission(Permissions.CONTACTS_MANAGE))
  .use(auditLog({ module: "contacts", action: "ASSIGN", entityType: "ContactSubmission" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      assigneeId: z.string().min(1),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getContactService();
    return svc.assignTo(input.id, input.assigneeId);
  });

export const markReplied = authedProcedure
  .use(requirePermission(Permissions.CONTACTS_MANAGE))
  .use(auditLog({ module: "contacts", action: "REPLIED", entityType: "ContactSubmission" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const svc = getContactService();
    return svc.markReplied(input.id);
  });

export const deleteSubmission = authedProcedure
  .use(requirePermission(Permissions.CONTACTS_DELETE))
  .use(auditLog({ module: "contacts", action: "DELETE", entityType: "ContactSubmission" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const svc = getContactService();
    return svc.deleteSubmission(input.id);
  });
