import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./schema.prisma",
  migrate: {
    schema: "./schema.prisma",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
