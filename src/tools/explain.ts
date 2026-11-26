import { type McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { type Dependency, type GraphNode } from "../codeclarity";
import { AnalysisResultsTool } from "./analysis-results-tool";

// The graph's node for the workspace itself, which imports the direct dependencies.
const workspaceNode = "__VIRTUAL_ROOT__";
// Enough paths to see how a dependency comes in, without flooding the assistant.
const maxPaths = 20;

const dependencySchema = z.object({
  name: z.string(),
  version: z.string(),
  latest_version: z.string(),
  license: z.string(),
  direct: z.boolean().describe("true when the project imports it itself"),
  release_date: z.string(),
  latest_release_date: z.string(),
  vulnerabilities: z.array(z.string()),
  severity_counts: z
    .record(z.string(), z.number())
    .describe("how many of its vulnerabilities are of each class"),
});
type DependencySummary = z.infer<typeof dependencySchema>;

/** explain_dependency: says what a dependency is and which imports bring it in. */
export class ExplainDependencyTool extends AnalysisResultsTool {
  /**
   * Registers explain_dependency on a server
   *
   * @param server The server to register the tool on
   */
  register(server: McpServer): void {
    server.registerTool(
      "explain_dependency",
      {
        description:
          "Explain one dependency of a project: its license, latest version, vulnerabilities, and the import paths from the project that bring it in. By default reads the project's most recent ended analysis.",
        inputSchema: z.object({
          ...AnalysisResultsTool.targetInput,
          dependency: z
            .string()
            .describe(
              "the dependency as name@version, such as lodash@4.17.20, from get_findings",
            ),
        }),
        outputSchema: z.object({
          analysis_id: z.string(),
          ...dependencySchema.shape,
          paths: z
            .array(z.string())
            .describe(
              `the import paths that bring it in, from the project's direct dependency down, at most ${String(maxPaths)}`,
            ),
          paths_truncated: z
            .boolean()
            .describe(`true when it has more than ${String(maxPaths)} paths`),
        }),
        annotations: this.annotations("Explain a dependency"),
      },
      async ({ project_id, analysis_id, workspace, dependency }) => {
        const analysis = await this.endedAnalysis(project_id, analysis_id);
        const [details, graph] = await Promise.all([
          this.client.dependency(
            project_id,
            analysis.id,
            workspace,
            dependency,
          ),
          this.client.dependencyGraph(
            project_id,
            analysis.id,
            workspace,
            dependency,
          ),
        ]).catch((error: unknown) => {
          throw this.readError(
            `dependency ${dependency} of analysis ${analysis.id}`,
            error,
          );
        });
        const paths = this.importPaths(graph, dependency);
        return this.result({
          analysis_id: analysis.id,
          ...this.summary(details),
          paths: paths.slice(0, maxPaths),
          paths_truncated: paths.length > maxPaths,
        });
      },
    );
  }

  /**
   * Keeps what an assistant needs of a dependency
   *
   * @param dependency The dependency as the API sent it
   * @returns the dependency's summary
   */
  private summary(dependency: Dependency): DependencySummary {
    return {
      name: dependency.name,
      version: dependency.version,
      latest_version: dependency.latest_version,
      license: dependency.license,
      direct: dependency.direct,
      release_date: dependency.release_date,
      // The API spells it lastest.
      latest_release_date: dependency.lastest_release_date,
      vulnerabilities: dependency.vulnerabilities,
      severity_counts: dependency.severity_dist,
    };
  }

  /**
   * Walks the graph up from a dependency to the workspace, and writes each way as a path
   *
   * @param graph The nodes the API sent, each with the ids of the nodes that import it
   * @param dependency The dependency the paths end at, as name@version
   * @returns the paths, such as "express@4.17.1 > qs@6.7.0", stopping a little past maxPaths
   */
  private importPaths(graph: GraphNode[], dependency: string): string[] {
    const parents = new Map(graph.map((node) => [node.id, node.parentIds]));
    const paths: string[] = [];
    const walk = (id: string, below: string[]): void => {
      if (paths.length > maxPaths) {
        return;
      }
      for (const parent of parents.get(id) ?? []) {
        if (parent === workspaceNode) {
          paths.push([id, ...below].join(" > "));
        } else if (parent !== dependency && !below.includes(parent)) {
          walk(parent, [id, ...below]);
        }
      }
    };
    walk(dependency, []);
    return paths;
  }
}
