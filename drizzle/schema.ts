import {
  pgTable,
  uniqueIndex,
  foreignKey,
  timestamp,
  integer,
  uuid,
  text,
  boolean,
  index,
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
    emailSent: timestamp("email_sent", { withTimezone: true }),
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
    userId: uuid("user_id").notNull(),
    expires: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => {
    return {
      sessionUserIdFkey: foreignKey({
        columns: [table.userId],
        foreignColumns: [user.id],
        name: "session_user_id_fkey",
      })
        .onUpdate("cascade")
        .onDelete("cascade"),
    };
  }
);

export const user = pgTable(
  "user",
  {
    id: uuid().primaryKey().notNull(),
    email: text().notNull(),
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
    userId: uuid("user_id").notNull(),
    visitor_count: integer().default(0).notNull(),
    discoverable: boolean().default(false).notNull(),
  },
  (table) => {
    return {
      slugKey: uniqueIndex("blog_slug_key").using(
        "btree",
        table.slug.asc().nullsLast().op("text_ops")
      ),
      userIdKey: uniqueIndex("blog_user_id_key").using(
        "btree",
        table.userId.asc().nullsLast().op("uuid_ops")
      ),
      blogUserIdFkey: foreignKey({
        columns: [table.userId],
        foreignColumns: [user.id],
        name: "blog_user_id_fkey",
      })
        .onUpdate("cascade")
        .onDelete("restrict"),
    };
  }
);

export const mailingListSubscription = pgTable(
  "mailing_list_subscription",
  {
    id: uuid().primaryKey().notNull(),
    email: text().notNull(),
    blogId: uuid("blog_id").notNull(),
    created: timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    unsubscribeToken: text("unsubscribe_token").notNull(),
  },
  (table) => {
    return {
      emailBlogIdKey: uniqueIndex("mailing_list_subscription_email_blog_id_key").using(
        "btree",
        table.email.asc().nullsLast().op("text_ops"),
        table.blogId.asc().nullsLast().op("uuid_ops")
      ),
      unsubscribeTokenKey: uniqueIndex("mailing_list_subscription_unsubscribe_token_key").using(
        "btree",
        table.unsubscribeToken.asc().nullsLast().op("text_ops")
      ),
      mailingListSubscriptionBlogIdFkey: foreignKey({
        columns: [table.blogId],
        foreignColumns: [blog.id],
        name: "mailing_list_subscription_blog_id_fkey",
      })
        .onUpdate("cascade")
        .onDelete("cascade"),
    };
  }
);


export const emailQueue = pgTable(
  "email_queue",
  {
    id: text("id").primaryKey(),
    blogId: text("blog_id")
      .notNull()
      .references(() => blog.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    status: text("status").notNull().default("pending"), // pending, processing, completed, failed
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
    scheduledFor: timestamp("scheduled_for").defaultNow().notNull(),
    errorMessage: text("error_message"),
  },
  (table) => {
    return {
      statusIdx: index("email_queue_status_idx").on(table.status),
      scheduledIdx: index("email_queue_scheduled_idx").on(table.scheduledFor),
      createdAtIdx: index("email_queue_created_at_idx").on(table.createdAt),
    };
  }
);
