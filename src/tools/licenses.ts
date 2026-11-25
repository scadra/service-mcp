import { type McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { type License } from "../codeclarity";
import { AnalysisResultsTool } from "./analysis-results-tool";

const licenseSchema = z.object({
  id: z.string().describe("the SPDX id, such as MIT"),
  name: z.string(),
  category: z.string().describe("such as permissive or copy_left"),
  compliance_violation: z
    .boolean()
    .describe("true when the organization's policy forbids it"),
  dependencies: z
    .array(z.string())
    .describe("the dependencies under it, as name@version"),
});
type LicenseSummary = z.infer<typeof licenseSchema>;

/** list_licenses: lists the licenses of an analysis, the policy violations first. */
export class ListLicensesTool extends AnalysisResultsTool {
  /**
   * Registers list_licenses on a server
   *
   * @param server The server to register the tool on
   */
  register(server: McpServer): void {
    server.registerTool(
      "list_licenses",
      {
        description:
          "List the licenses of a project's dependencies, each with the dependencies under it: the policy violations first, then the most used. By default reads the project's most recent ended analysis.",
        inputSchema: z.object(AnalysisResultsTool.targetInput),
        outputSchema: z.object({
          analysis_id: z
            .string()
            .describe("the analysis the licenses come from"),
          licenses: z.array(licenseSchema),
        }),
        annotations: this.annotations("List licenses"),
      },
      async ({ project_id, analysis_id, workspace }) => {
        const analysis = await this.endedAnalysis(project_id, analysis_id);
        const licenses = await this.client
          .licenses(project_id, analysis.id, workspace)
          .catch((error: unknown) => {
            throw this.readError(
              `the licenses of analysis ${analysis.id}`,
              error,
            );
          });
        const ordered = licenses
          .map((license) => this.summary(license))
          .sort(
            (left, right) =>
              Number(right.compliance_violation) -
                Number(left.compliance_violation) ||
              right.dependencies.length - left.dependencies.length,
          );
        return this.result({ analysis_id: analysis.id, licenses: ordered });
      },
    );
  }

  /**
   * Keeps what an assistant needs of a license, without its text and properties
   *
   * @param license The license as the API sent it
   * @returns the license's summary
   */
  private summary(license: License): LicenseSummary {
    return {
      id: license.id,
      name: license.name,
      category: license.license_category,
      compliance_violation: license.license_compliance_violation,
      dependencies: license.deps_using_license,
    };
  }
}
