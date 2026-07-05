import { db } from "./src/db/index.js";
import { users } from "./src/db/schema.js";
import { eq } from "drizzle-orm";

async function main() {
  const email = "demo@coinnova.io";
  console.log(`Deleting user: ${email}`);
  const result = await db.delete(users).where(eq(users.email, email));
  console.log("Done.");
  process.exit(0);
}

main().catch(console.error);
