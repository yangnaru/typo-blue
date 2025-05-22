import { drizzle } from "drizzle-orm/node-postgres";

import type { InferSelectModel } from "drizzle-orm";
import { user, session } from "@/drizzle/schema";
import * as schema from "@/drizzle/schema";
import * as relations from "@/drizzle/relations";

export const db = drizzle({
  connection: process.env.DATABASE_URL!,
  schema: { ...schema, ...relations },
});

export type Database = typeof db;
export type User = InferSelectModel<typeof user>;
export type Session = InferSelectModel<typeof session>;
