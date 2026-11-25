import { type CallToolResult } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { connect } from "./testing";

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
    const { client } = await connect(
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
    const { client } = await connect(
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
    const { client } = await connect(200, "{}");

    const { tools } = await client.listTools();

    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint, tool.name).toBe(true);
    }
  });
});
