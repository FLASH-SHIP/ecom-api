import { getMemberService } from "@ecom/features/di/containers/MemberService";
import { Permissions } from "@ecom/lib/permissions";
import { auditLog } from "@ecom/trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@ecom/trpc/server/trpc";
import { z } from "zod";

const memberStatusEnum = z.enum(["ACTIVE", "INACTIVE", "BANNED"]);

export const list = authedProcedure
  .use(requirePermission(Permissions.MEMBERS_READ))
  .input(
    z.object({
      status: memberStatusEnum.optional(),
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(500).default(50),
    }),
  )
  .query(async ({ input }) => {
    const service = getMemberService();
    return service.listMembers(
      { status: input.status, search: input.search },
      input.page,
      input.perPage,
    );
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.MEMBERS_READ))
  .input(z.object({ id: z.number() }))
  .query(async ({ input }) => {
    const service = getMemberService();
    return service.getMember(input.id);
  });

export const create = authedProcedure
  .use(requirePermission(Permissions.MEMBERS_CREATE))
  .use(auditLog({ module: "members", action: "CREATE", entityType: "Member" }))
  .input(
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
      phone: z.string().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const service = getMemberService();
    return service.createMember(input);
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.MEMBERS_UPDATE))
  .use(auditLog({ module: "members", action: "UPDATE", entityType: "Member" }))
  .input(
    z.object({
      id: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      avatarUrl: z.string().optional(),
      status: memberStatusEnum.optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    const service = getMemberService();
    return service.updateMember(id, data);
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.MEMBERS_DELETE))
  .use(auditLog({ module: "members", action: "DELETE", entityType: "Member" }))
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    const service = getMemberService();
    return service.deleteMember(input.id);
  });

export const stats = authedProcedure
  .use(requirePermission(Permissions.MEMBERS_READ))
  .query(async () => {
    const service = getMemberService();
    return service.getStats();
  });
