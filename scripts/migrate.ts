// Applies drizzle/*.sql, as `drizzle-kit migrate` does, but with only
// drizzle-orm and pg: the Dockerfile bundles this into one file, so the image
// ships neither drizzle-kit nor pnpm. Both record migrations in the same
// drizzle.__drizzle_migrations table.

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const db = drizzle({ connection: process.env.DATABASE_URL! });

// No top-level await: `pnpm migrate` runs this through tsx as CommonJS.
migrate(db, { migrationsFolder: process.env.MIGRATIONS_FOLDER ?? "drizzle" })
  .then(() => console.log("Migrations applied"))
  .finally(() => db.$client.end());
