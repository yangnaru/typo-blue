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
  unique,
  check,
  json,
  jsonb,
  AnyPgColumn,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql, SQL } from "drizzle-orm";

const currentTimestamp = sql`CURRENT_TIMESTAMP`;

type Uuid = string;

export const actorTypeEnum = pgEnum("actor_type", [
  "Person",
  "Service",
  "Group",
  "Application",
  "Organization",
]);

export const emailVerificationChallenge = pgTable(
  "email_verification_challenge",
  {
    id: uuid().primaryKey().notNull(),
    code: text().notNull(),
    email: text().notNull(),
    expires: timestamp({ withTimezone: true }).notNull(),
  }
);

export const postTable = pgTable(
  "post",
  {
    id: uuid().primaryKey().notNull(),
    created: timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updated: timestamp({ withTimezone: true }).notNull(),
    published: timestamp({ withTimezone: true }),
    first_published: timestamp("first_published", { withTimezone: true }),
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
      firstPublishedRequired: sql`CONSTRAINT first_published_required CHECK (published IS NULL OR first_published IS NOT NULL)`,
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
      emailBlogIdKey: uniqueIndex(
        "mailing_list_subscription_email_blog_id_key"
      ).using(
        "btree",
        table.email.asc().nullsLast().op("text_ops"),
        table.blogId.asc().nullsLast().op("uuid_ops")
      ),
      unsubscribeTokenKey: uniqueIndex(
        "mailing_list_subscription_unsubscribe_token_key"
      ).using("btree", table.unsubscribeToken.asc().nullsLast().op("text_ops")),
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
    id: uuid("id").primaryKey().notNull(),
    blogId: uuid("blog_id")
      .notNull()
      .references(() => blog.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => postTable.id, { onDelete: "cascade" }),
    subscriberEmail: text("subscriber_email").notNull(),
    unsubscribeToken: text("unsubscribe_token").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull().default("pending"), // pending, processing, completed, failed
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
    scheduledFor: timestamp("scheduled_for").defaultNow().notNull(),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at"),
    openedAt: timestamp("opened_at"),
    clickedAt: timestamp("clicked_at"),
  },
  (table) => {
    return {
      statusIdx: index("email_queue_status_idx").on(table.status),
      scheduledIdx: index("email_queue_scheduled_idx").on(table.scheduledFor),
      createdAtIdx: index("email_queue_created_at_idx").on(table.createdAt),
      blogIdIdx: index("email_queue_blog_id_idx").on(table.blogId),
      postIdIdx: index("email_queue_post_id_idx").on(table.postId),
      subscriberEmailIdx: index("email_queue_subscriber_email_idx").on(
        table.subscriberEmail
      ),
      sentAtIdx: index("email_queue_sent_at_idx").on(table.sentAt),
      openedAtIdx: index("email_queue_opened_at_idx").on(table.openedAt),
      clickedAtIdx: index("email_queue_clicked_at_idx").on(table.clickedAt),
    };
  }
);

export const pageViews = pgTable(
  "page_views",
  {
    id: uuid().primaryKey().notNull(),
    blogId: uuid("blog_id").notNull(),
    postId: uuid("post_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    ipAddress: text("ip_address").notNull(), // Store as inet type (IPv6 compatible)
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    path: text("path").notNull(),
  },
  (table) => {
    return {
      pageViewsBlogIdFkey: foreignKey({
        columns: [table.blogId],
        foreignColumns: [blog.id],
        name: "page_views_blog_id_fkey",
      })
        .onUpdate("cascade")
        .onDelete("cascade"),
      pageViewsPostIdFkey: foreignKey({
        columns: [table.postId],
        foreignColumns: [postTable.id],
        name: "page_views_post_id_fkey",
      })
        .onUpdate("cascade")
        .onDelete("cascade"),
      blogIdIdx: index("page_views_blog_id_idx").on(table.blogId),
      postIdIdx: index("page_views_post_id_idx").on(table.postId),
      createdAtIdx: index("page_views_created_at_idx").on(table.createdAt),
      ipAddressIdx: index("page_views_ip_address_idx").on(table.ipAddress),
    };
  }
);

export const actorTable = pgTable(
  "actor",
  {
    id: uuid().$type<Uuid>().primaryKey(),
    iri: text().notNull().unique(),
    type: actorTypeEnum().notNull(),
    username: text().notNull(),
    instanceHost: text("instance_host")
      .notNull()
      .references(() => instanceTable.host),
    handleHost: text("handle_host").notNull(),
    handle: text()
      .notNull()
      .generatedAlwaysAs(
        (): SQL =>
          sql`'@' || ${actorTable.username} || '@' || ${actorTable.handleHost}`
      ),
    blogId: uuid("blog_id")
      .$type<Uuid>()
      .unique()
      .references(() => blog.id, { onDelete: "cascade" }),
    name: text(),
    bioHtml: text("bio_html"),
    automaticallyApprovesFollowers: boolean("automatically_approves_followers")
      .notNull()
      .default(false),
    avatarUrl: text("avatar_url"),
    headerUrl: text("header_url"),
    inboxUrl: text("inbox_url").notNull(),
    sharedInboxUrl: text("shared_inbox_url"),
    followersUrl: text("followers_url"),
    featuredUrl: text("featured_url"),
    fieldHtmls: json("field_htmls")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    emojis: jsonb().$type<Record<string, string>>().notNull().default({}),
    tags: jsonb().$type<Record<string, string>>().notNull().default({}),
    sensitive: boolean().notNull().default(false),
    successorId: uuid("successor_id")
      .$type<Uuid>()
      .references((): AnyPgColumn => actorTable.id, { onDelete: "set null" }),
    aliases: text()
      .array()
      .notNull()
      .default(sql`(ARRAY[]::text[])`),
    followeesCount: integer("followees_count").notNull().default(0),
    followersCount: integer("followers_count").notNull().default(0),
    postsCount: integer("posts_count").notNull().default(0),
    publicKeyPem: text("public_key_pem"),
    privateKeyPem: text("private_key_pem"),
    url: text(),
    updated: timestamp({ withTimezone: true })
      .notNull()
      .default(currentTimestamp),
    published: timestamp({ withTimezone: true }),
    created: timestamp({ withTimezone: true })
      .notNull()
      .default(currentTimestamp),
  },
  (table) => [
    unique().on(table.username, table.instanceHost),
    check("actor_username_check", sql`${table.username} NOT LIKE '%@%'`),
  ]
);

export const followingTable = pgTable(
  "following",
  {
    iri: text().notNull().primaryKey(),
    followerId: uuid("follower_id")
      .$type<Uuid>()
      .notNull()
      .references(() => actorTable.id, { onDelete: "cascade" }),
    followeeId: uuid("followee_id")
      .$type<Uuid>()
      .notNull()
      .references(() => actorTable.id, { onDelete: "cascade" }),
    accepted: timestamp({ withTimezone: true }),
    created: timestamp({ withTimezone: true })
      .notNull()
      .default(currentTimestamp),
  },
  (table) => [
    unique().on(table.followerId, table.followeeId),
    index().on(table.followerId),
  ]
);

export const instanceTable = pgTable(
  "instance",
  {
    host: text().primaryKey(),
    software: text(),
    softwareVersion: text("software_version"),
    updated: timestamp({ withTimezone: true })
      .notNull()
      .default(currentTimestamp),
    created: timestamp({ withTimezone: true })
      .notNull()
      .default(currentTimestamp),
  },
  (table) => [check("instance_host_check", sql`${table.host} NOT LIKE '%@%'`)]
);

export const notificationTypeEnum = pgEnum("notification_type", [
  "mention",
  "quote",
  "reply",
  "like",
  "emoji_react",
  "announce",
]);

export const notificationTable = pgTable(
  "notification",
  {
    id: uuid()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    type: notificationTypeEnum().notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => actorTable.id, { onDelete: "cascade" }),
    activityId: text("activity_id").notNull(), // ActivityPub activity IRI
    objectId: text("object_id"), // Optional: IRI of the object being mentioned/quoted
    postId: uuid("post_id").references(() => postTable.id, {
      onDelete: "cascade",
    }), // Local post being mentioned/quoted (if any)
    content: text(), // Content of the mention/quote
    isRead: boolean("is_read").notNull().default(false),
    created: timestamp({ withTimezone: true })
      .notNull()
      .default(currentTimestamp),
    updated: timestamp({ withTimezone: true })
      .notNull()
      .default(currentTimestamp),
  },
  (table) => [
    index("notification_created_idx").on(table.created),
    index("notification_is_read_idx").on(table.isRead),
    unique("notification_activity_id_unique").on(table.activityId),
    unique("notification_type_actor_id_object_id_content_unique").on(
      table.type,
      table.actorId,
      table.objectId,
      table.content
    ),
  ]
);
