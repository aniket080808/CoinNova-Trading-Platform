import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);

async function check() {
  const adminId = "00000000-0000-0000-0000-000000000000";
  const user = await sql`SELECT id, email, role FROM users WHERE id = ${adminId}`;
  const wallet = await sql`SELECT * FROM wallets WHERE user_id = ${adminId}`;
  
  console.log("Admin User:", user);
  console.log("Admin Wallet:", wallet);
  process.exit(0);
}

check();
