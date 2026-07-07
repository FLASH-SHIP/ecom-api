import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import { prisma } from "./src/index";

async function run() {
  try {
    const meta = await prisma.languageMeta.findMany({
      where: { referenceId: 10, referenceType: "tag" },
    });
    console.log("META FOR TAG 10:", JSON.stringify(meta, null, 2));
  } catch (error) {
    console.error("Failed:", error);
  }
}

run();
