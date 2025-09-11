import { configure, getConsoleSink } from "@logtape/logtape";

export async function register() {
  await configure({
    contextLocalStorage: new AsyncLocalStorage(),
    sinks: { console: getConsoleSink() },
    loggers: [
      {
        category: ["fedify", "federation", "inbox"],
        lowestLevel: "debug",
      },
      {
        category: ["logtape", "meta"],
        lowestLevel: "warning",
      },
    ],
  });
}
