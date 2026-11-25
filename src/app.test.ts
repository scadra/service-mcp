import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { McpApp } from "./app";

const env = {
  CODECLARITY_URL: "http://cc.test/api",
  CODECLARITY_ORG: "org-1",
  CODECLARITY_TOKEN: "ccot_test",
};

describe("McpApp", () => {
  it("takes its version from package.json", () => {
    expect(McpApp.fromEnv(env).version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("refuses to start without the CLI's variables", () => {
    expect(() => McpApp.fromEnv({})).toThrow(
      "set CODECLARITY_ORG, CODECLARITY_TOKEN, CODECLARITY_URL",
    );
  });

  it("serves the tools on the transport it is given", async () => {
    const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
    const handle = McpApp.fromEnv(env).serveStdio(serverSide);
    const client = new Client({ name: "test", version: "test" });
    await client.connect(clientSide);

    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name)).toEqual([
      "whoami",
      "list_projects",
      "list_analyses",
      "get_findings",
      "list_licenses",
    ]);
    await handle.close();
  });
});
