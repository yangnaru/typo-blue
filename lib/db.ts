import { drizzle } from "drizzle-orm/node-postgres";

import type { InferSelectModel } from "drizzle-orm";
import { user, session } from "./schema";
import * as schema from "./schema";

export const db = drizzle({
  connection: process.env.DATABASE_URL!,
  schema,
});

export type User = InferSelectModel<typeof user>;
export type Session = InferSelectModel<typeof session>;
