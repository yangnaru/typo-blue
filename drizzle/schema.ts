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

export const follow = pgTable(
  "Follow",
  {
    id: serial().primaryKey().notNull(),
    createdAt: timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull(),
    followerId: integer().notNull(),
    followingId: integer().notNull(),
  },
  (table) => {
    return {
      followerIdFollowingIdKey: uniqueIndex(
        "Follow_followerId_followingId_key"
      ).using(
        "btree",
        table.followerId.asc().nullsLast().op("int4_ops"),
        table.followingId.asc().nullsLast().op("int4_ops")
      ),
      followFollowerIdFkey: foreignKey({
        columns: [table.followerId],
        foreignColumns: [blog.id],
        name: "Follow_followerId_fkey",
      })
        .onUpdate("cascade")
        .onDelete("restrict"),
      followFollowingIdFkey: foreignKey({
        columns: [table.followingId],
        foreignColumns: [blog.id],
        name: "Follow_followingId_fkey",
      })
        .onUpdate("cascade")
        .onDelete("restrict"),
    };
  }
);

export const emailVerificationChallenge = pgTable(
  "EmailVerificationChallenge",
  {
    id: uuid().primaryKey().notNull(),
    code: text().notNull(),
    email: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  }
);

export const post = pgTable(
  "Post",
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
        name: "Post_blogId_fkey",
      })
        .onUpdate("cascade")
        .onDelete("cascade"),
    };
  }
);

export const session = pgTable(
  "Session",
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
        name: "Session_userId_fkey",
      })
        .onUpdate("cascade")
        .onDelete("cascade"),
    };
  }
);

export const user = pgTable(
  "User",
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
      emailKey: uniqueIndex("User_email_key").using(
        "btree",
        table.email.asc().nullsLast().op("text_ops")
      ),
    };
  }
);

export const blog = pgTable(
  "Blog",
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
      slugKey: uniqueIndex("Blog_slug_key").using(
        "btree",
        table.slug.asc().nullsLast().op("text_ops")
      ),
      userIdKey: uniqueIndex("Blog_userId_key").using(
        "btree",
        table.userId.asc().nullsLast().op("int4_ops")
      ),
      blogUserIdFkey: foreignKey({
        columns: [table.userId],
        foreignColumns: [user.id],
        name: "Blog_userId_fkey",
      })
        .onUpdate("cascade")
        .onDelete("restrict"),
    };
  }
);
