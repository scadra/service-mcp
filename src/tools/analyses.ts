import { type McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { type AnalysisSummary } from "../codeclarity";
import { ReadOnlyTool } from "./tool";

const analysisSchema = z.object({
  id: z.string(),
  status: z.string().describe("such as completed, failure or started"),
  branch: z.string(),
  tag: z.string().nullable(),
  created_on: z.string(),
  failure_reason: z
    .string()
    .nullable()
    .describe("why the analysis failed, or null"),
});

/** list_analyses: lists a project's analyses, the most recent first. */
export class ListAnalysesTool extends ReadOnlyTool {
  /**
   * Registers list_analyses on a server
   *
   * @param server The server to register the tool on
   */
  register(server: McpServer): void {
    server.registerTool(
      "list_analyses",
      {
        description:
          "List a project's analyses, the most recent first, with their status, branch and failure reason.",
        inputSchema: z.object({
          project_id: z
            .string()
            .describe("the project's id, from list_projects"),
        }),
        outputSchema: z.object({ analyses: z.array(analysisSchema) }),
        annotations: this.annotations("List analyses"),
      },
      async ({ project_id }) => {
        const analyses = await this.client
          .analyses(project_id)
          .catch((error: unknown) => {
            throw this.readError(
              `the analyses of project ${project_id}`,
              error,
            );
          });
        const newestFirst = [...analyses].sort((left, right) =>
          right.created_on.localeCompare(left.created_on),
        );
        return this.result({
          analyses: newestFirst.map((analysis) => this.summary(analysis)),
        });
      },
    );
  }

  /**
   * Keeps what an assistant needs of an analysis, without its plugins' results
   *
   * @param analysis The analysis as the API sent it
   * @returns the analysis's summary
   */
  private summary(analysis: AnalysisSummary): z.infer<typeof analysisSchema> {
    return {
      id: analysis.id,
      status: analysis.status,
      branch: analysis.branch,
      tag: analysis.tag,
      created_on: analysis.created_on,
      failure_reason: analysis.failure_reason,
    };
  }
}
