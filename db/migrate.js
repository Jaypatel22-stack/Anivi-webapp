// Applies pending SQL migrations from db/migrations/ to DATABASE_URL.
// Uses drizzle-orm's own migrator (not the drizzle-kit CLI), so this works
// in the slim production image, which doesn't carry devDependencies.
//
// Usage:
//   node db/migrate.js
//
// Safe to run every deploy: drizzle tracks which migrations already ran in
// a `drizzle.__drizzle_migrations` table and only applies new ones.
import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client.js";

async function main() {
  console.log("Running database migrations...");
  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("Migrations up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
