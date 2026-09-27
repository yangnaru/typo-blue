// Lets Next.js prefetch a blog's pages up to here and switch to them at once
// on a click, the blog's header already drawn, while the page itself is on its
// way. Readers in Korea reach the server through Cloudflare in Los Angeles, so
// that wait is most of a second.
export default function Loading() {
  return <p className="text-neutral-500">불러오는 중...</p>;
}
