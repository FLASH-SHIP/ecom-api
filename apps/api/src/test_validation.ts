import "./load-env";
import { prisma } from "@ecom/prisma";

async function main() {
  console.log("process.env.DATABASE_URL:", process.env.DATABASE_URL);
  try {
    const count = await prisma.outboxEvent.count();
    console.log("SUCCESS! count of outboxEvents:", count);
  } catch (err: any) {
    console.error("FAILED to query outboxEvent:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
