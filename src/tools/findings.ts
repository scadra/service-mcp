import { type McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { type Finding } from "../codeclarity";
import { AnalysisResultsTool } from "./analysis-results-tool";

/** How serious a finding is, as the API classes it. */
export const SeverityClass = {
  Critical: "CRITICAL",
  High: "HIGH",
  Medium: "MEDIUM",
  Low: "LOW",
  None: "NONE",
} as const;
export type SeverityClass = (typeof SeverityClass)[keyof typeof SeverityClass];

// From the most serious down, so a minimum keeps a prefix.
const severityOrder: string[] = Object.values(SeverityClass);

const findingSchema = z.object({
  vulnerability: z.string().describe("such as CVE-2021-44906 or GHSA-…"),
  severity: z.string().describe("CRITICAL, HIGH, MEDIUM, LOW or NONE"),
  score: z.number().describe("the CVSS score, 0 to 10"),
  affected: z
    .array(z.string())
    .describe("the dependencies it affects, as name@version"),
  description: z.string(),
});
type FindingSummary = z.infer<typeof findingSchema>;

/** get_findings: lists the vulnerabilities of an analysis, the most serious first. */
export class GetFindingsTool extends AnalysisResultsTool {
  /**
   * Registers get_findings on a server
   *
   * @param server The server to register the tool on
   */
  register(server: McpServer): void {
    server.registerTool(
      "get_findings",
      {
        description:
          "List the vulnerabilities an analysis found in a project's dependencies, the most serious first. By default reads the project's most recent ended analysis.",
        inputSchema: z.object({
          ...AnalysisResultsTool.targetInput,
          min_severity: z
            .enum([
              SeverityClass.Critical,
              SeverityClass.High,
              SeverityClass.Medium,
              SeverityClass.Low,
            ])
            .optional()
            .describe("only the findings of this class or above"),
        }),
        outputSchema: z.object({
          analysis_id: z
            .string()
            .describe("the analysis the findings come from"),
          total: z
            .number()
            .describe("how many findings the analysis has in all"),
          findings: z.array(findingSchema),
        }),
        annotations: this.annotations("Get findings"),
      },
      async ({ project_id, analysis_id, workspace, min_severity }) => {
        const analysis = await this.endedAnalysis(project_id, analysis_id);
        const findings = await this.client
          .findings(project_id, analysis.id, workspace)
          .catch((error: unknown) => {
            throw this.readError(
              `the findings of analysis ${analysis.id}`,
              error,
            );
          });
        const kept = findings
          .map((finding) => this.summary(finding))
          .filter(
            (finding) =>
              min_severity === undefined || this.atLeast(finding, min_severity),
          )
          .sort((left, right) => right.score - left.score);
        return this.result({
          analysis_id: analysis.id,
          total: findings.length,
          findings: kept,
        });
      },
    );
  }

  /**
   * Keeps what an assistant needs of a finding, without its CVSS details and import paths
   *
   * @param finding The finding as the API sent it
   * @returns the finding's summary
   */
  private summary(finding: Finding): FindingSummary {
    return {
      vulnerability: finding.Vulnerability,
      severity: finding.Severity.SeverityClass,
      score: finding.Severity.Severity,
      affected: finding.Affected.map(
        (affected) =>
          `${affected.AffectedDependency}@${affected.AffectedVersion}`,
      ),
      description: finding.Description,
    };
  }

  /**
   * Tells whether a finding is at least as serious as a minimum
   *
   * @param finding The finding's summary
   * @param minimum The least serious class to keep
   * @returns true when the finding's class is the minimum or above
   */
  private atLeast(finding: FindingSummary, minimum: SeverityClass): boolean {
    const rank = severityOrder.indexOf(finding.severity);
    return rank !== -1 && rank <= severityOrder.indexOf(minimum);
  }
}
