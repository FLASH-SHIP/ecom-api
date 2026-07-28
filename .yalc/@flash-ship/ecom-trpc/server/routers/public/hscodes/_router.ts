import * as hsCodeFeatures from "@ecom/features/hscodes/hscode-service";
import { publicProcedure, router } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

export const publicHsCodeRouter = router({
  getTree: publicProcedure.query(async () => {
    return hsCodeFeatures.getTree();
  }),

  getDetail: publicProcedure.input(z.object({ code: z.string() })).query(async ({ input }) => {
    return hsCodeFeatures.getDetail(input.code);
  }),

  search: publicProcedure.input(z.object({ query: z.string() })).query(async ({ input }) => {
    return hsCodeFeatures.search(input.query);
  }),

  getCountries: publicProcedure.query(async () => {
    return hsCodeFeatures.getCountries();
  }),

  getTransportModes: publicProcedure.query(async () => {
    return hsCodeFeatures.getTransportModes();
  }),

  calculate: publicProcedure
    .input(
      z.object({
        code: z.string(),
        value: z.number(),
        mode: z.string(),
        country: z.string().optional(),
        entryDate: z.string().optional(),
        loadingDate: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return hsCodeFeatures.calculate(
        input.code,
        input.value,
        input.mode,
        input.country,
        input.entryDate,
        input.loadingDate,
      );
    }),
});
export type PublicHsCodeRouter = typeof publicHsCodeRouter;
