import { configure, getConsoleSink } from "@logtape/logtape";
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }

  await configure({
    contextLocalStorage: new AsyncLocalStorage(),
    sinks: { console: getConsoleSink() },
    loggers: [
      {
        category: [],
        sinks: ["console"],
        lowestLevel: "info",
      },
      {
        category: ["logtape", "meta"],
        lowestLevel: "warning",
      },
      {
        category: ["fedify", "federation", "inbox"],
        lowestLevel: "debug",
      },
    ],
  });

  // The email worker shares the server's process rather than paying for a
  // second Node.js in its own container. In development, run it with
  // `pnpm email-worker` when you want mail sent.
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production"
  ) {
    const { emailWorker } = await import("./lib/queue/email-worker");
    // Stop taking jobs; Next finishes the requests in flight and exits. A job
    // cut short stays `processing` and is retried on the next start.
    process.once("SIGTERM", () => emailWorker.stop());
    emailWorker.start().catch((error) => {
      console.error("Failed to start email worker:", error);
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
