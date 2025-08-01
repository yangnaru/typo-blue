import { relations } from "drizzle-orm/relations";
import {
  blog,
  postTable,
  user,
  session,
  actorTable,
  notificationTable,
} from "./schema";

export const actorRelations = relations(actorTable, ({ one }) => ({
  blog: one(blog, {
    fields: [actorTable.blogId],
    references: [blog.id],
  }),
}));

export const blogRelations = relations(blog, ({ one, many }) => ({
  posts: many(postTable),
  user: one(user, {
    fields: [blog.userId],
    references: [user.id],
  }),
  actor: one(actorTable, {
    fields: [blog.id],
    references: [actorTable.blogId],
  }),
}));

export const postRelations = relations(postTable, ({ one }) => ({
  blog: one(blog, {
    fields: [postTable.blogId],
    references: [blog.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  blogs: many(blog),
}));

export const notificationRelations = relations(
  notificationTable,
  ({ one }) => ({
    post: one(postTable, {
      fields: [notificationTable.postId],
      references: [postTable.id],
    }),
  })
);
