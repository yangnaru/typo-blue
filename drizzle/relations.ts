import { relations } from "drizzle-orm/relations";
import { blog, post, user, session, actorTable } from "./schema";

export const blogRelations = relations(blog, ({ one, many }) => ({
  posts: many(post),
  user: one(user, {
    fields: [blog.userId],
    references: [user.id],
  }),
  actor: one(actorTable, {
    fields: [blog.id],
    references: [actorTable.blogId],
  }),
}));

export const postRelations = relations(post, ({ one }) => ({
  blog: one(blog, {
    fields: [post.blogId],
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
