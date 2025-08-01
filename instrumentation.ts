import { configure, getConsoleSink } from "@logtape/logtape";

export async function register() {
  await configure({
    sinks: { console: getConsoleSink() },
    loggers: [
      {
        category: ["fedify", "federation", "inbox"],
        sinks: ["console"],
        lowestLevel: "debug",
      },
    ],
  });
}
