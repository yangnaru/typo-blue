import {
  Follow,
  Undo,
  Announce,
  Like,
  EmojiReact,
  Delete,
  Create,
} from "@fedify/fedify";
import {
  federation,
  fedifyRequestHandler,
  routePrefix,
} from "./federation/core";
import { setupAllDispatchers } from "./federation/dispatchers";
import { activityHandlers } from "./federation/activities";

// Re-export commonly used items
export { federation, fedifyRequestHandler, routePrefix };
export {
  sendActorUpdateToFollowers,
  sendNoteToFollowers,
} from "./federation/activities";
export {
  getPersistedActor,
  persistActor,
  persistInstance,
  updateFolloweesCount,
  updateFollowersCount,
} from "./federation/actors";
export type { Instance, NewInstance } from "./federation/actors";
export type { Database, ContextData } from "./federation/core";

// Main federation setup - setup dispatchers and inbox listeners

// Setup all dispatchers
setupAllDispatchers();

// Setup inbox listeners with activity handlers

federation
  .setInboxListeners(`${routePrefix}/users/{identifier}/inbox`, `/inbox`)
  .on(Undo, async (ctx, undo) => {
    const object = await undo.getObject({ ...ctx, suppressError: true });
    if (object instanceof Follow)
      await activityHandlers.onUnfollowed(ctx, undo);
    if (object instanceof Announce)
      await activityHandlers.onPostUnshared(ctx, undo);
    if (object instanceof Like) await activityHandlers.onPostUnliked(ctx, undo);
    if (object instanceof EmojiReact)
      await activityHandlers.onReactionUndoneOnPost(ctx, undo);
  })
  .on(Announce, activityHandlers.onPostShared)
  .on(Follow, activityHandlers.onFollowed)
  .on(Create, activityHandlers.onCreate)
  .on(Like, activityHandlers.onPostLiked)
  .on(Delete, activityHandlers.onPostDeleted)
  .on(EmojiReact, activityHandlers.onReactedOnPost);

export default federation;
