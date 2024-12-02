import { relations } from "drizzle-orm/relations";
import { blog, post, user, session, follow, guestbook } from "./schema";

export const postRelations = relations(post, ({one}) => ({
	blog: one(blog, {
		fields: [post.blogId],
		references: [blog.id]
	}),
}));

export const blogRelations = relations(blog, ({one, many}) => ({
	posts: many(post),
	user: one(user, {
		fields: [blog.userId],
		references: [user.id]
	}),
	follows_followerId: many(follow, {
		relationName: "follow_followerId_blog_id"
	}),
	follows_followingId: many(follow, {
		relationName: "follow_followingId_blog_id"
	}),
	guestbooks: many(guestbook),
}));

export const userRelations = relations(user, ({many}) => ({
	blogs: many(blog),
	sessions: many(session),
	guestbooks: many(guestbook),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const followRelations = relations(follow, ({one}) => ({
	blog_followerId: one(blog, {
		fields: [follow.followerId],
		references: [blog.id],
		relationName: "follow_followerId_blog_id"
	}),
	blog_followingId: one(blog, {
		fields: [follow.followingId],
		references: [blog.id],
		relationName: "follow_followingId_blog_id"
	}),
}));

export const guestbookRelations = relations(guestbook, ({one}) => ({
	user: one(user, {
		fields: [guestbook.authorId],
		references: [user.id]
	}),
	blog: one(blog, {
		fields: [guestbook.blogId],
		references: [blog.id]
	}),
}));