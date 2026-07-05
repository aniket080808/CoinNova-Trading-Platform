import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);

async function check() {
  const columns = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'learn_questions'
  `;
  console.log("Columns:", JSON.stringify(columns, null, 2));
  process.exit(0);
}

check().catch(console.error);
