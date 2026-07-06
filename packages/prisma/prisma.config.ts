import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./schema",
  migrate: {
    schema: "./schema",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
