import { getHsCodeService } from "@ecom/features/di/containers/HsCodeService";
import { publicProcedure, router } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

export const publicHsCodeRouter = router({
  getTree: publicProcedure.query(async () => {
    return getHsCodeService().getTree();
  }),
  getDetail: publicProcedure.input(z.object({ code: z.string() })).query(async ({ input }) => {
    return getHsCodeService().getDetail(input.code);
  }),
  search: publicProcedure.input(z.object({ query: z.string() })).query(async ({ input }) => {
    return getHsCodeService().search(input.query);
  }),
  getHeadingTree: publicProcedure.input(z.object({ code: z.string() })).query(async ({ input }) => {
    return getHsCodeService().getHeadingTree(input.code);
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
      return getHsCodeService().calculate(input);
    }),
  getCountries: publicProcedure.query(async () => {
    const data = await getHsCodeService().getCountries();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return data.map((c) => ({
      ...c,
      flag: c.flag ? `${apiUrl}${c.flag}` : null,
    }));
  }),
  getTransportModes: publicProcedure.query(async () => {
    return getHsCodeService().getTransportModes();
  }),
});
