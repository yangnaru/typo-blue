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
        lowestLevel: "debug",
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
}

export const onRequestError = Sentry.captureRequestError;
