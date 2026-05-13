import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  const userId = "7232eeb9-4c96-4cb9-9735-94a3c79f43ba";
  await sql`UPDATE wallets SET balance_usd = 1000 WHERE user_id = ${userId}`;
  console.log("Balance updated for user:", userId);
  process.exit(0);
}

run().catch(console.error);
