import { describe, expect, it } from "vitest";
import { connect } from "./testing";

const older = {
  id: "a1",
  status: "failure",
  branch: "main",
  tag: null,
  created_on: "2026-11-24T10:00:00Z",
  failure_reason: "the repository could not be downloaded",
  steps: [[{ Name: "js-sbom" }]],
};
const newer = {
  ...older,
  id: "a2",
  status: "completed",
  tag: "v1.0.0",
  created_on: "2026-11-25T10:00:00Z",
  failure_reason: null,
};

describe("list_analyses", () => {
  it("lists the project's analyses, the most recent first, without their steps", async () => {
    const { client, urls } = await connect(
      200,
      JSON.stringify({
        data: [older, newer],
        page: 0,
        total_pages: 1,
        total_entries: 2,
      }),
    );

    const result = await client.callTool({
      name: "list_analyses",
      arguments: { project_id: "p1" },
    });

    expect(urls[0]).toBe(
      "http://cc.test/api/org/org-1/projects/p1/analyses?page=0&entries_per_page=100",
    );
    expect(result.structuredContent).toEqual({
      analyses: [
        {
          id: "a2",
          status: "completed",
          branch: "main",
          tag: "v1.0.0",
          created_on: "2026-11-25T10:00:00Z",
          failure_reason: null,
        },
        {
          id: "a1",
          status: "failure",
          branch: "main",
          tag: null,
          created_on: "2026-11-24T10:00:00Z",
          failure_reason: "the repository could not be downloaded",
        },
      ],
    });
  });

  it("names the project when the API refuses it", async () => {
    const { client } = await connect(
      404,
      '{"error_code":"EntityNotFound","error_message":"Entity not found"}',
    );

    const result = await client.callTool({
      name: "list_analyses",
      arguments: { project_id: "p9" },
    });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain(
      "reading the analyses of project p9: Entity not found (HTTP 404, EntityNotFound)",
    );
  });
});
