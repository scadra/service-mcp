import { describe, expect, it } from "vitest";
import { connect } from "./testing";

/**
 * Builds a page of a paginated answer
 *
 * @param data The page's items
 * @returns the page as the API sends it
 */
function page(data: unknown[]): string {
  return JSON.stringify({
    data,
    page: 0,
    total_pages: 1,
    total_entries: data.length,
  });
}

/**
 * Builds a license as the API sends it, with the text the tool drops
 *
 * @param id The SPDX id
 * @param violation Whether the policy forbids it
 * @param dependencies The dependencies under it
 * @returns the license
 */
function license(
  id: string,
  violation: boolean,
  dependencies: string[],
): unknown {
  return {
    id,
    name: `${id} License`,
    description: "A long license text.",
    license_category: violation ? "copy_left" : "permissive",
    license_compliance_violation: violation,
    unable_to_infer: false,
    deps_using_license: dependencies,
    license_properties: { permissions: ["commercial-use"] },
    references: [],
  };
}

describe("list_licenses", () => {
  it("lists the policy violations first, then the most used", async () => {
    const { client, urls } = await connect(200, [
      page([
        { id: "a1", status: "completed", created_on: "2026-11-25T10:00:00Z" },
      ]),
      page([
        license("ISC", false, ["inherits@2.0.3"]),
        license("MIT", false, ["lodash@4.17.20", "minimist@1.2.5"]),
        license("GPL-3.0", true, ["readline@1.0.0"]),
      ]),
    ]);

    const result = await client.callTool({
      name: "list_licenses",
      arguments: { project_id: "p1" },
    });

    expect(urls[1]).toBe(
      "http://cc.test/api/org/org-1/projects/p1/analysis/a1/licenses?workspace=.&page=0&entries_per_page=100",
    );
    expect(result.structuredContent).toEqual({
      analysis_id: "a1",
      licenses: [
        {
          id: "GPL-3.0",
          name: "GPL-3.0 License",
          category: "copy_left",
          compliance_violation: true,
          dependencies: ["readline@1.0.0"],
        },
        {
          id: "MIT",
          name: "MIT License",
          category: "permissive",
          compliance_violation: false,
          dependencies: ["lodash@4.17.20", "minimist@1.2.5"],
        },
        {
          id: "ISC",
          name: "ISC License",
          category: "permissive",
          compliance_violation: false,
          dependencies: ["inherits@2.0.3"],
        },
      ],
    });
  });
});
