import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);

async function seedAdmin() {
  const ADMIN_ID = "00000000-0000-0000-0000-000000000000";
  const ADMIN_EMAIL = "admin@gmail.com";
  const PIN = "123456";
  const PASSWORD = "Admin123@";
  
  console.log("🌱 Seeding admin user...");
  
  const pinHash = await bcrypt.hash(PIN, 12);
  const passHash = await bcrypt.hash(PASSWORD, 12);

  // 1. Ensure user exists
  await sql`
    INSERT INTO users (id, name, email, password_hash, role, transaction_pin, email_verified)
    VALUES (${ADMIN_ID}, 'System Admin', ${ADMIN_EMAIL}, ${passHash}, 'admin', ${pinHash}, true)
    ON CONFLICT (id) DO UPDATE SET
      transaction_pin = ${pinHash},
      role = 'admin',
      email_verified = true
  `;

  // 2. Ensure wallet exists with some initial funds
  await sql`
    INSERT INTO wallets (user_id, balance_usd)
    VALUES (${ADMIN_ID}, '10000.00')
    ON CONFLICT (user_id) DO NOTHING
  `;

  console.log("✅ Admin user and wallet ready.");
  console.log("   Email: " + ADMIN_EMAIL);
  console.log("   PIN:   " + PIN);
  
  process.exit(0);
}

seedAdmin().catch(err => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
