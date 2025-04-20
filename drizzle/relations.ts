import { relations } from "drizzle-orm/relations";
import { blog, post, user, session } from "./schema";

export const blogRelations = relations(blog, ({ one, many }) => ({
  posts: many(post),
  user: one(user, {
    fields: [blog.userId],
    references: [user.id],
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
