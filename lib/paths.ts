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

export function getBlogGuestbookPath(slug: string) {
  return `/@${slug}/guestbook`;
}

export function getBlogNewPostPath(slug: string) {
  return `/@${slug}/new-post`;
}

export function getBlogPostEditPath(slug: string, encodedPostId: string) {
  return `/@${slug}/${encodedPostId}/edit`;
}

export function getBlogEditPath(slug: string) {
  return `/@${slug}/edit`;
}

export function getAccountChangeEmailPath() {
  return "/account/change-email";
}

export function getAccountSetPasswordPath() {
  return "/account/set-password";
}
