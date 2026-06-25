import * as path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
console.log("Environment loaded. DATABASE_URL:", process.env.DATABASE_URL);
