"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

interface PageViewTrackerProps {
  blogId: string;
  postId?: string;
}

export function PageViewTracker({ blogId, postId }: PageViewTrackerProps) {
  const pathname = usePathname();

  useEffect(() => {
    const trackPageView = async () => {
      try {
        // Get client-side information
        const userAgent = navigator.userAgent;
        const referrer = document.referrer || null;
        
        // Make a request to track the page view
        await fetch("/api/track-page-view", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            blogId,
            postId: postId || null,
            userAgent,
            referrer,
            path: pathname,
          }),
        });
      } catch (error) {
        // Silently fail - we don't want tracking errors to affect user experience
        console.debug("Page view tracking failed:", error);
      }
    };

    // Track page view after a short delay to ensure the page has loaded
    const timer = setTimeout(trackPageView, 1000);
    
    return () => clearTimeout(timer);
  }, [blogId, postId, pathname]);

  // This component doesn't render anything
  return null;
}