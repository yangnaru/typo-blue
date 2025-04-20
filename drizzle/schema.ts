import {
  pgTable,
  uniqueIndex,
  foreignKey,
  serial,
  timestamp,
  integer,
  uuid,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const emailVerificationChallenge = pgTable(
  "email_verification_challenge",
  {
    id: uuid().primaryKey().notNull(),
    code: text().notNull(),
    email: text().notNull(),
    expires: timestamp({ withTimezone: true }).notNull(),
  }
);

export const post = pgTable(
  "post",
  {
    id: uuid().primaryKey().notNull(),
    created: timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updated: timestamp({ withTimezone: true }).notNull(),
    published: timestamp({ withTimezone: true }),
    title: text(),
    content: text(),
    blogId: uuid("blog_id").notNull(),
    deleted: timestamp({ withTimezone: true }),
  },
  (table) => {
    return {
      postBlogIdFkey: foreignKey({
        columns: [table.blogId],
        foreignColumns: [blog.id],
        name: "post_blogId_fkey",
      })
        .onUpdate("cascade")
        .onDelete("cascade"),
    };
  }
);

export const session = pgTable(
  "session",
  {
    id: text().primaryKey().notNull(),
    userId: integer().notNull(),
    expires: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => {
    return {
      sessionUserIdFkey: foreignKey({
        columns: [table.userId],
        foreignColumns: [user.id],
        name: "session_userId_fkey",
      })
        .onUpdate("cascade")
        .onDelete("cascade"),
    };
  }
);

export const user = pgTable(
  "user",
  {
    id: serial().primaryKey().notNull(),
    name: text(),
    email: text().notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text(),
    created: timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updated: timestamp({ withTimezone: true }).notNull(),
    passwordHash: text("password_hash"),
  },
  (table) => {
    return {
      emailKey: uniqueIndex("user_email_key").using(
        "btree",
        table.email.asc().nullsLast().op("text_ops")
      ),
    };
  }
);

export const blog = pgTable(
  "blog",
  {
    id: uuid().primaryKey().notNull(),
    created: timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updated: timestamp({ withTimezone: true }).notNull(),
    slug: text().notNull(),
    name: text(),
    description: text(),
    userId: integer("user_id").notNull(),
    visitorCount: integer().default(0).notNull(),
    discoverable: boolean().default(false).notNull(),
  },
  (table) => {
    return {
      slugKey: uniqueIndex("blog_slug_key").using(
        "btree",
        table.slug.asc().nullsLast().op("text_ops")
      ),
      userIdKey: uniqueIndex("blog_userId_key").using(
        "btree",
        table.userId.asc().nullsLast().op("int4_ops")
      ),
      blogUserIdFkey: foreignKey({
        columns: [table.userId],
        foreignColumns: [user.id],
        name: "blog_userId_fkey",
      })
        .onUpdate("cascade")
        .onDelete("restrict"),
    };
  }
);
