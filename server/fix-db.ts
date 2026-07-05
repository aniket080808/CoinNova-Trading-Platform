import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config();

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  try {
    console.log("Running migration...");
    await sql`ALTER TABLE learn_questions ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT ''`;
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

main();
