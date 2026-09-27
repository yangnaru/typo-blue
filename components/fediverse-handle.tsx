// A fediverse handle such as @blog@typo.blue. Cloudflare takes it for an email
// address and replaces it in the HTML with "[email protected]", which only its
// script puts back, so the handle is wrapped in the comments that tell
// Cloudflare to leave it alone. React cannot render comments, hence the raw
// HTML.
export function FediverseHandle({
  handle,
  className,
  as: Tag = "code",
}: {
  handle: string;
  className?: string;
  as?: "code" | "span";
}) {
  const escaped = handle.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );

  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{
        __html: `<!--email_off-->${escaped}<!--/email_off-->`,
      }}
    />
  );
}
