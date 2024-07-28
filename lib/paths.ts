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

export function getBlogPostPath(slug: string, encodedPostId: string) {
  return `/@${slug}/${encodedPostId}`;
}

export function getBlogGuestbookPath(slug: string) {
  return `/@${slug}/guestbook`;
}

export function getBlogNewPostPath(slug: string) {
  return `/@${slug}/posts/new`;
}

export function getBlogPostEditPath(slug: string, encodedPostId: string) {
  return `/@${slug}/posts/${encodedPostId}/edit`;
}

export function getBlogDashboardPath(slug: string) {
  return `/@${slug}/dashboard`;
}

export function getBlogSettingsPath(slug: string) {
  return `/@${slug}/settings`;
}

export function getAccountChangeEmailPath() {
  return "/account/change-email";
}

export function getAccountSetPasswordPath() {
  return "/account/set-password";
}
