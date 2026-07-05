import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema.js";
export declare const db: import("drizzle-orm/neon-serverless").NeonDatabase<typeof schema> & {
    $client: Pool;
};
export type DB = typeof db;
