import SiteFooter from "@/components/site-footer";

// The service's own pages, as opposed to blogs, which end with a footer of
// their own.
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}
