import { getAdministrativeService } from "@ecom/features/di/containers/AdministrativeService";
import { authedProcedure } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

export const listProvinces = authedProcedure
  .input(
    z
      .object({
        search: z.string().optional(),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const result = await getAdministrativeService().listProvinces({
      search: input?.search,
      limit: 100,
      orderBy: "asc",
    });
    return result.items;
  });

export const listWards = authedProcedure
  .input(
    z.object({
      provinceCode: z.number().int().positive(),
      search: z.string().optional(),
    }),
  )
  .query(async ({ input }) => {
    const result = await getAdministrativeService().listWards({
      provinceCode: input.provinceCode,
      search: input.search,
      limit: 100,
      orderBy: "asc",
    });
    return result.items;
  });

export const listStates = authedProcedure
  .input(
    z
      .object({
        search: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const result = await getAdministrativeService().listDivisions({
      countryCode: "US",
      level: 1,
      search: input?.search,
      limit: input?.limit ?? 100,
      orderBy: "asc",
    });
    return result.items;
  });

export const listCities = authedProcedure
  .input(
    z.object({
      parentId: z.number().int().positive(),
      search: z.string().optional(),
      limit: z.number().int().positive().optional(),
    }),
  )
  .query(async ({ input }) => {
    const result = await getAdministrativeService().listDivisions({
      countryCode: "US",
      level: 2,
      parentId: input.parentId,
      search: input.search,
      limit: input.limit ?? 100,
      orderBy: "asc",
    });
    return result.items;
  });
