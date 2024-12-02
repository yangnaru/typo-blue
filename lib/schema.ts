import {
  pgTable,
  timestamp,
  text,
  integer,
  foreignKey,
  uuid,
  uniqueIndex,
  serial,
  boolean,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

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

export type Post = typeof post.$inferSelect;
export type NewPost = typeof post.$inferInsert;

export const postRelations = relations(post, ({ one }) => ({
  blog: one(blog, {
    fields: [post.blogId],
    references: [blog.id],
  }),
}));

export const blog = pgTable(
  "Blog",
  {
    id: serial().primaryKey().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: "string" }).notNull(),
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

export type Blog = typeof blog.$inferSelect;
export type NewBlog = typeof blog.$inferInsert;

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

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

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

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export const emailVerificationChallenge = pgTable(
  "EmailVerificationChallenge",
  {
    id: uuid().primaryKey().notNull(),
    code: text().notNull(),
    email: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  }
);

export type EmailVerificationChallenge =
  typeof emailVerificationChallenge.$inferSelect;
export type NewEmailVerificationChallenge =
  typeof emailVerificationChallenge.$inferInsert;

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

export type Follow = typeof follow.$inferSelect;
export type NewFollow = typeof follow.$inferInsert;

export const guestbook = pgTable(
  "Guestbook",
  {
    id: serial().primaryKey().notNull(),
    uuid: uuid().notNull(),
    createdAt: timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    repliedAt: timestamp({ withTimezone: true }),
    content: text().notNull(),
    reply: text(),
    authorId: integer().notNull(),
    blogId: integer().notNull(),
  },
  (table) => {
    return {
      uuidKey: uniqueIndex("Guestbook_uuid_key").using(
        "btree",
        table.uuid.asc().nullsLast().op("uuid_ops")
      ),
      guestbookAuthorIdFkey: foreignKey({
        columns: [table.authorId],
        foreignColumns: [user.id],
        name: "Guestbook_authorId_fkey",
      })
        .onUpdate("cascade")
        .onDelete("restrict"),
      guestbookBlogIdFkey: foreignKey({
        columns: [table.blogId],
        foreignColumns: [blog.id],
        name: "Guestbook_blogId_fkey",
      })
        .onUpdate("cascade")
        .onDelete("cascade"),
    };
  }
);

export type Guestbook = typeof guestbook.$inferSelect;
export type NewGuestbook = typeof guestbook.$inferInsert;
