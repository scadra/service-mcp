import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import { CodeClarityClient } from "../codeclarity";
import { createServer } from "./server";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

/**
 * Connects a client to the server, on an API that answers every request with body
 *
 * @param body The body of every answer
 * @returns the connected client
 */
async function connect(body: string): Promise<Client> {
  globalThis.fetch = (): Promise<Response> =>
    Promise.resolve(new Response(body, { status: 200 }));
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

const analysis = {
  status: "completed",
  branch: "main",
  tag: null,
  failure_reason: null,
  steps: [[{ Name: "js-sbom" }]],
};

describe("list_projects", () => {
  it("keeps only the most recent analysis of each project", async () => {
    const client = await connect(
      JSON.stringify({
        data: [
          {
            id: "p1",
            name: "vulnapp",
            type: "FILE",
            url: "",
            default_branch: "",
            added_on: "2026-11-25T20:03:35.642Z",
            files: [],
            analyses: [
              { ...analysis, id: "a1", created_on: "2026-11-24T10:00:00Z" },
              { ...analysis, id: "a2", created_on: "2026-11-25T10:00:00Z" },
            ],
          },
          {
            id: "p2",
            name: "empty",
            type: "GITHUB",
            url: "https://github.com/acme/empty",
            default_branch: "main",
            added_on: "2026-11-25T20:03:35.642Z",
            files: [],
            analyses: [],
          },
        ],
        page: 0,
        total_pages: 1,
        total_entries: 2,
      }),
    );

    const result = await client.callTool({ name: "list_projects" });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      projects: [
        {
          id: "p1",
          name: "vulnapp",
          type: "FILE",
          url: "",
          default_branch: "",
          added_on: "2026-11-25T20:03:35.642Z",
          last_analysis: {
            id: "a2",
            status: "completed",
            branch: "main",
            created_on: "2026-11-25T10:00:00Z",
          },
        },
        {
          id: "p2",
          name: "empty",
          type: "GITHUB",
          url: "https://github.com/acme/empty",
          default_branch: "main",
          added_on: "2026-11-25T20:03:35.642Z",
          last_analysis: null,
        },
      ],
    });
  });
});
