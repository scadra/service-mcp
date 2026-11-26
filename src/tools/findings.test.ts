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
 * Builds a finding as the API sends it, with the details the tool drops
 *
 * @param id The vulnerability's id
 * @param severityClass The severity class, such as HIGH
 * @param score The CVSS score
 * @returns the finding
 */
function finding(id: string, severityClass: string, score: number): unknown {
  return {
    Vulnerability: id,
    Severity: { Severity: score, SeverityClass: severityClass, Vectors: [] },
    Affected: [
      {
        AffectedDependency: "minimist",
        AffectedVersion: "1.2.5",
        OSVMatch: { Dependency: {} },
      },
    ],
    Description: `${id} description`,
    Sources: ["OSV"],
  };
}

const analyses = page([
  { id: "a1", status: "completed", created_on: "2026-11-24T10:00:00Z" },
  { id: "a2", status: "completed", created_on: "2026-11-25T10:00:00Z" },
  { id: "a3", status: "started", created_on: "2026-11-25T11:00:00Z" },
]);

describe("get_findings", () => {
  it("reads the most recent ended analysis, the most serious finding first", async () => {
    const { client, urls } = await connect(200, [
      analyses,
      page([
        finding("CVE-2021-23337", "HIGH", 7.2),
        finding("CVE-2021-44906", "CRITICAL", 9.8),
      ]),
    ]);

    const result = await client.callTool({
      name: "get_findings",
      arguments: { project_id: "p1" },
    });

    expect(urls[1]).toBe(
      "http://cc.test/api/org/org-1/projects/p1/analysis/a2/vulnerabilities?workspace=.&page=0&entries_per_page=100",
    );
    expect(result.structuredContent).toEqual({
      analysis_id: "a2",
      total: 2,
      findings: [
        {
          vulnerability: "CVE-2021-44906",
          severity: "CRITICAL",
          score: 9.8,
          affected: ["minimist@1.2.5"],
          description: "CVE-2021-44906 description",
        },
        {
          vulnerability: "CVE-2021-23337",
          severity: "HIGH",
          score: 7.2,
          affected: ["minimist@1.2.5"],
          description: "CVE-2021-23337 description",
        },
      ],
    });
  });

  it("keeps only the findings at or above min_severity", async () => {
    const { client } = await connect(200, [
      analyses,
      page([
        finding("CVE-1", "LOW", 2),
        finding("CVE-2", "HIGH", 7),
        finding("CVE-3", "MEDIUM", 5),
      ]),
    ]);

    const result = await client.callTool({
      name: "get_findings",
      arguments: { project_id: "p1", min_severity: "MEDIUM" },
    });

    expect(result.structuredContent).toMatchObject({
      total: 3,
      findings: [{ vulnerability: "CVE-2" }, { vulnerability: "CVE-3" }],
    });
  });

  it("refuses an analysis that has not ended", async () => {
    const { client } = await connect(200, analyses);

    const result = await client.callTool({
      name: "get_findings",
      arguments: { project_id: "p1", analysis_id: "a3" },
    });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain(
      "analysis a3 is started, so it has no results yet",
    );
  });

  it("says when the project has no ended analysis", async () => {
    const { client } = await connect(200, page([]));

    const result = await client.callTool({
      name: "get_findings",
      arguments: { project_id: "p1" },
    });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain(
      "project p1 has no ended analysis yet",
    );
  });
});
