import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);

async function seedAdminPin() {
  const ADMIN_ID = "00000000-0000-0000-0000-000000000000";
  const PIN = "123456";
  
  const hash = await bcrypt.hash(PIN, 12);
  
  await sql`
    UPDATE users 
    SET transaction_pin = ${hash},
        transaction_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = ${ADMIN_ID}
  `;
  
  console.log("✅ Admin transaction PIN set to 123456");
  process.exit(0);
}

seedAdminPin().catch(err => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
