import { describe, expect, it } from "vitest";
import { connect } from "./testing";

const fixes = JSON.stringify({
  data: [
    {
      rank: {
        severity_class: "HIGH",
        known_exploited: false,
        high_epss: true,
        prod: true,
        instance_count: 5,
      },
      kind: "force_version",
      package: "qs",
      target_version: "6.16.1",
      potentially_breaking: false,
      vulnerability_id: "CVE-2022-24999",
      vulnerability_count: 5,
      project_count: 1,
      instance_count: 5,
      remediations: [
        {
          project_id: "p1",
          project_name: "vulnapp",
          workspace: ".",
          command: "npm pkg set 'overrides[qs]=6.16.1' && npm install",
          ticket: null,
        },
      ],
    },
  ],
});

describe("fix_next", () => {
  it("asks for ten upgrades by default and flattens their rank", async () => {
    const { client, urls } = await connect(200, fixes);

    const result = await client.callTool({ name: "fix_next" });

    expect(urls).toEqual([
      "http://cc.test/api/org/org-1/remediations/fix-next?limit=10",
    ]);
    expect(result.structuredContent).toEqual({
      fixes: [
        {
          package: "qs",
          target_version: "6.16.1",
          kind: "force_version",
          potentially_breaking: false,
          severity: "HIGH",
          known_exploited: false,
          high_epss: true,
          vulnerability_id: "CVE-2022-24999",
          vulnerability_count: 5,
          project_count: 1,
          remediations: [
            {
              project_id: "p1",
              project_name: "vulnapp",
              workspace: ".",
              command: "npm pkg set 'overrides[qs]=6.16.1' && npm install",
            },
          ],
        },
      ],
    });
  });

  it("refuses a limit above 50 before calling the API", async () => {
    const { client, urls } = await connect(200, fixes);

    const result = await client.callTool({
      name: "fix_next",
      arguments: { limit: 51 },
    });

    expect(result.isError).toBe(true);
    expect(urls).toEqual([]);
  });
});
