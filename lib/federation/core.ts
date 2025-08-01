import { createFederation } from "@fedify/fedify";
import { PostgresKvStore, PostgresMessageQueue } from "@fedify/postgres";
import postgres from "postgres";
import { getXForwardedRequest } from "x-forwarded-fetch";
import { db } from "../db";

export type Database = typeof db;

export type ContextData = {
  db: Database;
  canonicalOrigin?: string;
};

export const routePrefix = `/ap`;

const pg = postgres(process.env.DATABASE_URL!);

export const federation = createFederation<ContextData>({
  kv: new PostgresKvStore(pg),
  queue: new PostgresMessageQueue(pg),
});

export const fedifyRequestHandler = integrateFederation((request: Request) => ({
  db,
  canonicalOrigin: `https://${process.env.NEXT_PUBLIC_DOMAIN!}`,
}));

function integrateFederation<TContextData>(
  contextDataFactory: (request: Request) => TContextData | Promise<TContextData>
) {
  return async (request: Request) => {
    const forwardedRequest = await getXForwardedRequest(request);
    const contextData = await contextDataFactory(forwardedRequest);
    return await federation.fetch(forwardedRequest, {
      contextData: contextData as any,
      onNotFound: () => {
        return new Response("Not found", { status: 404 });
      },
      onNotAcceptable: () => {
        return new Response("Not acceptable", {
          status: 406,
          headers: {
            "Content-Type": "text/plain",
            Vary: "Accept",
          },
        });
      },
    });
  };
}
