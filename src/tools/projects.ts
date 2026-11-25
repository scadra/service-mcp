import { type McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { type CodeClarityClient, type Project } from "../codeclarity";
import { readOnly } from "./annotations";
import { jsonResult, readError } from "./results";

const lastAnalysisSchema = z
  .object({
    id: z.string(),
    status: z.string().describe("such as completed, failure or started"),
    branch: z.string(),
    created_on: z.string(),
  })
  .nullable()
  .describe("the project's most recent analysis, or null when it has none");

const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z
    .string()
    .describe("FILE for an upload, or the host of a linked repository"),
  url: z.string().describe("the repository's URL, empty for an upload"),
  default_branch: z.string(),
  added_on: z.string(),
  last_analysis: lastAnalysisSchema,
});

/**
 * Keeps what an assistant needs of a project, and only its most recent analysis
 *
 * @param project The project as the API sent it
 * @returns the project's summary
 */
function summary(project: Project): z.infer<typeof projectSchema> {
  const last = project.analyses.reduce<Project["analyses"][number] | null>(
    (latest, analysis) =>
      latest === null || analysis.created_on > latest.created_on
        ? analysis
        : latest,
    null,
  );
  return {
    id: project.id,
    name: project.name,
    type: project.type,
    url: project.url,
    default_branch: project.default_branch,
    added_on: project.added_on,
    last_analysis:
      last === null
        ? null
        : {
            id: last.id,
            status: last.status,
            branch: last.branch,
            created_on: last.created_on,
          },
  };
}

/**
 * Registers list_projects, which lists the organization's projects with their last analysis
 *
 * @param server The server to register the tool on
 * @param client The client the tool reads through
 */
export function registerListProjects(
  server: McpServer,
  client: CodeClarityClient,
): void {
  server.registerTool(
    "list_projects",
    {
      description:
        "List the organization's projects, each with its most recent analysis. Start here to find a project or analysis id.",
      inputSchema: z.object({
        search: z
          .string()
          .optional()
          .describe("only the projects whose name contains this text"),
      }),
      outputSchema: z.object({ projects: z.array(projectSchema) }),
      annotations: readOnly("List projects"),
    },
    async ({ search }) => {
      const projects = await client.projects(search).catch((error: unknown) => {
        throw readError(`the projects of ${client.organizationId}`, error);
      });
      return jsonResult({ projects: projects.map(summary) });
    },
  );
}
