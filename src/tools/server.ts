import { McpServer } from "@modelcontextprotocol/server";
import { type CodeClarityClient } from "../codeclarity";
import { ListAnalysesTool } from "./analyses";
import { ExplainDependencyTool } from "./explain";
import { GetFindingsTool } from "./findings";
import { FixNextTool } from "./fix-next";
import { ListLicensesTool } from "./licenses";
import { ListProjectsTool } from "./projects";
import { type ReadOnlyTool } from "./tool";
import { WhoamiTool } from "./whoami";

const instructions = `Reads one CodeClarity organization's analysis results: projects, analyses, vulnerabilities,
dependencies and licenses. Every tool only reads; none starts an analysis or changes anything.`;

/**
 * Creates the MCP server, with every tool registered
 *
 * @param client The client every tool reads through
 * @param version The server's version, sent to MCP clients
 * @returns the server, ready to connect to a transport
 */
export function createServer(
  client: CodeClarityClient,
  version: string,
): McpServer {
  const server = new McpServer(
    { name: "codeclarity", title: "CodeClarity", version },
    { instructions },
  );
  const tools: ReadOnlyTool[] = [
    new WhoamiTool(client),
    new ListProjectsTool(client),
    new ListAnalysesTool(client),
    new GetFindingsTool(client),
    new ListLicensesTool(client),
    new ExplainDependencyTool(client),
    new FixNextTool(client),
  ];
  for (const tool of tools) {
    tool.register(server);
  }
  return server;
}
