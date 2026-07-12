import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log(
    "Connecting using connection string:",
    process.env.DATABASE_URL?.replace(/:[^@:]*@/, ":***@"),
  );
  await client.connect();
  const res = await client.query("SELECT NOW()");
  console.log("pg raw connect success:", res.rows[0]);
  await client.end();
}
main().catch(console.error);
