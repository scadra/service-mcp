import { Client } from "@modelcontextprotocol/client";
import {
  type CallToolResult,
  InMemoryTransport,
} from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import { CodeClarityClient } from "../codeclarity";
import { createServer } from "./server";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

/**
 * Connects a client to the server, on an API that answers every request the same way
 *
 * @param status The HTTP status of every answer
 * @param body The body of every answer
 * @returns the connected client
 */
async function connect(status: number, body: string): Promise<Client> {
  globalThis.fetch = (): Promise<Response> =>
    Promise.resolve(new Response(body, { status }));
  const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
  const server = createServer(
    new CodeClarityClient("http://cc.test/api", "org-1", "ccot_test"),
    "test",
  );
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "test" });
  await client.connect(clientSide);
  return client;
}

/**
 * Joins the text blocks of a tool's result
 *
 * @param result The tool's result
 * @returns the text of the result
 */
function text(result: CallToolResult): string {
  return result.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
}

describe("whoami", () => {
  it("names the organization and counts its projects", async () => {
    const client = await connect(
      200,
      '{"data":[{}],"page":0,"total_pages":2,"total_entries":2}',
    );

    const result = await client.callTool({ name: "whoami" });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      organization_id: "org-1",
      projects: 2,
    });
  });

  it("turns a refused token into a tool error", async () => {
    const client = await connect(
      401,
      '{"error_code":"NotAuthenticated","error_message":"Not authenticated"}',
    );

    const result = await client.callTool({ name: "whoami" });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain(
      "reading organization org-1: Not authenticated (HTTP 401",
    );
  });
});

describe("the server", () => {
  it("marks every tool read-only", async () => {
    const client = await connect(200, "{}");

    const { tools } = await client.listTools();

    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint, tool.name).toBe(true);
    }
  });
});
