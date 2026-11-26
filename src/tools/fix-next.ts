import { type McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { type Fix } from "../codeclarity";
import { ReadOnlyTool } from "./tool";

const fixSchema = z.object({
  package: z.string(),
  target_version: z.string().describe("the version to upgrade to"),
  kind: z
    .string()
    .describe(
      "upgrade_direct for a direct dependency, force_version to override a transitive one",
    ),
  potentially_breaking: z
    .boolean()
    .describe("true when the upgrade crosses a major version"),
  severity: z.string().describe("the most serious class it fixes"),
  known_exploited: z
    .boolean()
    .describe("true when CISA lists one it fixes as exploited"),
  high_epss: z
    .boolean()
    .describe("true when one it fixes is likely to be exploited"),
  vulnerability_id: z.string().describe("the most serious one it fixes"),
  vulnerability_count: z.number(),
  project_count: z.number(),
  remediations: z
    .array(
      z.object({
        project_id: z.string(),
        project_name: z.string(),
        workspace: z.string(),
        command: z.string().describe("the command that makes the upgrade"),
      }),
    )
    .describe("where to make the upgrade"),
});
type FixSummary = z.infer<typeof fixSchema>;

/** fix_next: ranks the organization's upgrades, the one that fixes the most first. */
export class FixNextTool extends ReadOnlyTool {
  /**
   * Registers fix_next on a server
   *
   * @param server The server to register the tool on
   */
  register(server: McpServer): void {
    server.registerTool(
      "fix_next",
      {
        description:
          "Rank the upgrades across the organization's projects, the one that fixes the most serious vulnerabilities first, each with the command that makes it.",
        inputSchema: z.object({
          limit: z
            .number()
            .int()
            .min(1)
            .max(50)
            .default(10)
            .describe("how many upgrades to return"),
        }),
        outputSchema: z.object({ fixes: z.array(fixSchema) }),
        annotations: this.annotations("Fix next"),
      },
      async ({ limit }) => {
        const fixes = await this.client
          .fixNext(limit)
          .catch((error: unknown) => {
            throw this.readError(
              `the upgrades of ${this.client.organizationId}`,
              error,
            );
          });
        return this.result({ fixes: fixes.map((fix) => this.summary(fix)) });
      },
    );
  }

  /**
   * Keeps what an assistant needs of an upgrade, flattening its rank
   *
   * @param fix The upgrade as the API sent it
   * @returns the upgrade's summary
   */
  private summary(fix: Fix): FixSummary {
    return {
      package: fix.package,
      target_version: fix.target_version,
      kind: fix.kind,
      potentially_breaking: fix.potentially_breaking,
      severity: fix.rank.severity_class,
      known_exploited: fix.rank.known_exploited,
      high_epss: fix.rank.high_epss,
      vulnerability_id: fix.vulnerability_id,
      vulnerability_count: fix.vulnerability_count,
      project_count: fix.project_count,
      remediations: fix.remediations.map((remediation) => ({
        project_id: remediation.project_id,
        project_name: remediation.project_name,
        workspace: remediation.workspace,
        command: remediation.command,
      })),
    };
  }
}
