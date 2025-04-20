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
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  }
);

export const post = pgTable(
  "post",
  {
    createdAt: timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull(),
    publishedAt: timestamp({ withTimezone: true }),
    uuid: uuid().primaryKey().notNull(),
    title: text(),
    content: text(),
    blogId: integer().notNull(),
    deletedAt: timestamp({ withTimezone: true }),
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
    expiresAt: timestamp({ withTimezone: true }).notNull(),
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
    emailVerified: timestamp({ withTimezone: true }),
    image: text(),
    createdAt: timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull(),
    passwordHash: text(),
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
    id: serial().primaryKey().notNull(),
    createdAt: timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull(),
    slug: text().notNull(),
    name: text(),
    description: text(),
    userId: integer().notNull(),
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
