import dotenv from "dotenv";
import path from "path";
import { defineConfig } from "prisma/config";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "./schema",
  migrate: {
    schema: "./schema",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
