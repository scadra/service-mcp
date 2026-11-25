import { describe, expect, it } from "vitest";
import { connect } from "./testing";

const analyses = JSON.stringify({
  data: [{ id: "a1", status: "completed", created_on: "2026-11-25T10:00:00Z" }],
  page: 0,
  total_pages: 1,
  total_entries: 1,
});

const dependency = JSON.stringify({
  data: {
    name: "qs",
    version: "6.7.0",
    latest_version: "6.14.0",
    dependencies: {},
    dev_dependencies: { tape: "^5.0.0" },
    direct: false,
    transitive: true,
    package_manager: "NPM",
    license: "BSD-3-Clause",
    release_date: "2019-03-22T00:00:00Z",
    lastest_release_date: "2025-01-14T00:00:00Z",
    vulnerabilities: ["CVE-2022-24999"],
    severity_dist: { critical: 0, high: 1, medium: 0, low: 0, none: 0 },
  },
});

/**
 * Builds a node of the dependency graph as the API sends it
 *
 * @param id The dependency, as name@version
 * @param parentIds The ones that import it
 * @returns the node
 */
function node(id: string, parentIds: string[]): unknown {
  return { id, parentIds, childrenIds: [], prod: true, dev: false };
}

const graph = JSON.stringify({
  data: [
    node("qs@6.7.0", ["express@4.17.1", "body-parser@1.19.0"]),
    node("__VIRTUAL_ROOT__", []),
    node("express@4.17.1", ["__VIRTUAL_ROOT__"]),
    node("body-parser@1.19.0", ["express@4.17.1"]),
  ],
});

describe("explain_dependency", () => {
  it("describes the dependency and every import path that brings it in", async () => {
    const { client, urls } = await connect(200, [analyses, dependency, graph]);

    const result = await client.callTool({
      name: "explain_dependency",
      arguments: { project_id: "p1", dependency: "qs@6.7.0" },
    });

    expect(urls.slice(1).sort()).toEqual([
      "http://cc.test/api/org/org-1/projects/p1/analysis/a1/sbom/dependency/graph?workspace=.&dependency=qs%406.7.0",
      "http://cc.test/api/org/org-1/projects/p1/analysis/a1/sbom/dependency?workspace=.&dependency=qs%406.7.0",
    ]);
    expect(result.structuredContent).toEqual({
      analysis_id: "a1",
      name: "qs",
      version: "6.7.0",
      latest_version: "6.14.0",
      license: "BSD-3-Clause",
      direct: false,
      release_date: "2019-03-22T00:00:00Z",
      latest_release_date: "2025-01-14T00:00:00Z",
      vulnerabilities: ["CVE-2022-24999"],
      severity_counts: { critical: 0, high: 1, medium: 0, low: 0, none: 0 },
      paths: [
        "express@4.17.1 > qs@6.7.0",
        "express@4.17.1 > body-parser@1.19.0 > qs@6.7.0",
      ],
      paths_truncated: false,
    });
  });
});
