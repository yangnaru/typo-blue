export function getRootPath() {
  return "/";
}

export function getLoginPath() {
  return "/auth/signin";
}

export function getAccountPath() {
  return "/account";
}

export function getBlogNewPath() {
  return "/blogs/new";
}

export function getBlogHomePath(slug: string) {
  return `/@${slug}`;
}

export function getBlogPostPathWithSlugAndUuid(slug: string, uuid: string) {
  return `/@${slug}/${uuid}`;
}

export function getBlogPostPath(slug: string, encodedPostId: string) {
  return `/@${slug}/${encodedPostId}`;
}

export function getBlogNewPostPath(slug: string) {
  return `/@${slug}/posts/new`;
}

export function getBlogPostEditPath(slug: string, encodedPostId: string) {
  return `/@${slug}/posts/${encodedPostId}/edit`;
}

export function getBlogPostsPath(slug: string) {
  return `/@${slug}/posts`;
}

export function getBlogSettingsPath(slug: string) {
  return `/@${slug}/settings`;
}

export function getBlogSubscribersPath(slug: string) {
  return `/@${slug}/subscribers`;
}

export function getBlogAnalyticsPath(slug: string) {
  return `/@${slug}/analytics`;
}

export function getBlogFediversePath(slug: string) {
  return `/@${slug}/fediverse`;
}

export function getBlogNotificationsPath(slug: string) {
  return `/@${slug}/notifications`;
}

export function getAccountChangeEmailPath() {
  return "/account/change-email";
}

export function getAccountSetPasswordPath() {
  return "/account/set-password";
}
