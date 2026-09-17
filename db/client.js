import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

// A single pooled connection, reused across hot-reloads in dev.
const globalForDb = globalThis;

const pool =
  globalForDb.__anvilPgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__anvilPgPool = pool;
}

export const db = drizzle(pool, { schema });
export { pool, schema };
