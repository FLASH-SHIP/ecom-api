import { getRevisionService } from "@ecom/features/di/containers/RevisionService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { z } from "zod";
import { authedProcedure, requirePermission } from "../../../../trpc";

const referenceTypeEnum = z.enum(["post", "page"]);

export const listRevisions = authedProcedure
  .use(requirePermission(Permissions.POSTS_READ))
  .input(
    z.object({
      referenceId: z.number().int().positive(),
      referenceType: referenceTypeEnum,
    }),
  )
  .query(async ({ input }) => {
    const svc = getRevisionService();
    return svc.listRevisions(input.referenceId, input.referenceType);
  });

export const getRevision = authedProcedure
  .use(requirePermission(Permissions.POSTS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const svc = getRevisionService();
    return svc.getRevision(input.id);
  });
