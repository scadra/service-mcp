import { z } from "zod";
import { type AnalysisSummary } from "../codeclarity";
import { ReadOnlyTool } from "./tool";

// The statuses of an analysis that has results, as the CLI reads them.
const endedStatuses = new Set(["completed", "finished", "success"]);

/** A tool that reads the results of one analysis of a project, in one workspace. */
export abstract class AnalysisResultsTool extends ReadOnlyTool {
  /** The inputs that name the results: a project, one of its analyses, a workspace. */
  protected static readonly targetInput = {
    project_id: z.string().describe("the project's id, from list_projects"),
    analysis_id: z
      .string()
      .optional()
      .describe(
        "one of the project's analyses, from list_analyses; by default its most recent ended one",
      ),
    workspace: z
      .string()
      .default(".")
      .describe('the workspace, "." for the project\'s root'),
  };

  /**
   * Finds the analysis whose results the tool reads, and refuses one that has none yet
   * @throws {Error} If the project has no such analysis, or it has not ended
   *
   * @param projectId The id of the project
   * @param analysisId The analysis asked for, or undefined for the most recent ended one
   * @returns the analysis
   */
  protected async endedAnalysis(
    projectId: string,
    analysisId: string | undefined,
  ): Promise<AnalysisSummary> {
    const analyses = await this.client
      .analyses(projectId)
      .catch((error: unknown) => {
        throw this.readError(`the analyses of project ${projectId}`, error);
      });
    if (analysisId === undefined) {
      const latest = analyses
        .filter((analysis) => endedStatuses.has(analysis.status))
        .sort((left, right) =>
          right.created_on.localeCompare(left.created_on),
        )[0];
      if (latest === undefined) {
        throw new Error(`project ${projectId} has no ended analysis yet`);
      }
      return latest;
    }
    const analysis = analyses.find((candidate) => candidate.id === analysisId);
    if (analysis === undefined) {
      throw new Error(`project ${projectId} has no analysis ${analysisId}`);
    }
    if (!endedStatuses.has(analysis.status)) {
      throw new Error(
        `analysis ${analysisId} is ${analysis.status}, so it has no results yet`,
      );
    }
    return analysis;
  }
}
