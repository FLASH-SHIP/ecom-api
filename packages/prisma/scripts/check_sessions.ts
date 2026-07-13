import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function main() {
  console.log("=== CHECK SESSIONS (RAW PG) ===");
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();

  const tzRes = await client.query("SHOW TIMEZONE");
  console.log("PostgreSQL Database Timezone:", tzRes.rows[0].timezone);

  const dbTimeRes = await client.query("SELECT NOW() as now, CURRENT_TIMESTAMP as current_ts");
  console.log("PostgreSQL Database Time (NOW()):", dbTimeRes.rows[0].now);
  console.log("PostgreSQL Database Time (CURRENT_TIMESTAMP):", dbTimeRes.rows[0].current_ts);

  const sessionsRes = await client.query(`
    SELECT id, "sessionToken", "userId", expires, "loginAt", "lastActiveAt", "createdAt"
    FROM sessions
    ORDER BY "createdAt" DESC
    LIMIT 2
  `);
  console.log("Admin Sessions:", JSON.stringify(sessionsRes.rows, null, 2));

  await client.end();
}

main().catch(console.error);
