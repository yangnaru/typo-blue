import sanitize from "sanitize-html";

// Post content is stored as the client sent it, so sanitize it wherever it's
// rendered as HTML
export function sanitizePostHtml(html: string) {
  return sanitize(html, {
    allowedTags: sanitize.defaults.allowedTags.concat(["img"]),
    allowedAttributes: {
      ...sanitize.defaults.allowedAttributes,
      img: ["src", "alt", "title", "width", "height", "loading"],
    },
    allowedSchemes: ["https"],
  });
}
