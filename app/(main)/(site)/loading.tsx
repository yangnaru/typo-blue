// Lets Next.js prefetch the service's own pages up to here, so a link such as
// the blog footer's "powered by typo blue" switches at once while the page is
// on its way. The wordmark sits where Logo draws it; the account menu, which
// needs the session, comes with the page.
export default function Loading() {
  return (
    <div className="space-y-4">
      <header className="flex flex-row items-center py-2">
        <h1 className="text-xl font-extrabold">
          typo <span className="text-blue-500">blue</span>
        </h1>
      </header>
      <p className="text-neutral-500">불러오는 중...</p>
    </div>
  );
}
