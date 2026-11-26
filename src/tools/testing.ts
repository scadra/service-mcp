import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { vi } from "vitest";
import { CodeClarityClient } from "../codeclarity";
import { createServer } from "./server";

/** A client connected to the server, and the URLs the server asked the fake API for. */
export interface Connection {
  client: Client;
  urls: string[];
}

/**
 * Connects a client to the server, on a fake API that answers with status and body
 *
 * @param status The HTTP status of every answer
 * @param body The body of every answer, or the bodies in turn, the last one repeated
 * @returns the connected client and the URLs the server asked for
 */
export async function connect(
  status: number,
  body: string | string[],
): Promise<Connection> {
  const bodies = typeof body === "string" ? [body] : body;
  const urls: string[] = [];
  // Restored after each test by vitest's unstubGlobals.
  vi.stubGlobal("fetch", (input: string | URL | Request): Promise<Response> => {
    urls.push(input instanceof Request ? input.url : input.toString());
    const answer = bodies[Math.min(urls.length, bodies.length) - 1] ?? "";
    return Promise.resolve(new Response(answer, { status }));
  });
  const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
  const server = createServer(
    new CodeClarityClient("http://cc.test/api", "org-1", "ccot_test"),
    "test",
  );
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "test" });
  await client.connect(clientSide);
  return { client, urls };
}
