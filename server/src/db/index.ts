import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { config } from "../config.js";
import * as schema from "./schema.js";

// Required for transactions in Node.js with Neon serverless
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: config.databaseUrl });
export const db = drizzle(pool, { schema });

export type DB = typeof db;
