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
  jsonb,
  pgEnum,
  check,
  json,
  AnyPgColumn,
  unique,
} from "drizzle-orm/pg-core";
import { SQL, sql } from "drizzle-orm";
import { Uuid } from "@/lib/uuid";

const currentTimestamp = sql`CURRENT_TIMESTAMP`;

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
    privateKey: jsonb("private_key").$type<JsonWebKey>(),
    publicKey: jsonb("public_key").$type<JsonWebKey>(),
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

export const instanceTable = pgTable(
  "instance",
  {
    host: text().primaryKey(),
    software: text(),
    softwareVersion: text("software_version"),
    updated: timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    created: timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [check("instance_host_check", sql`${table.host} NOT LIKE '%@%'`)]
);

export const actorTypeEnum = pgEnum("actor_type", [
  "Application",
  "Group",
  "Organization",
  "Person",
  "Service",
]);

export type ActorType = (typeof actorTypeEnum.enumValues)[number];

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
    blogId: integer("blog_id")
      .notNull()
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
