import { McpServer } from "@modelcontextprotocol/server";
import { type CodeClarityClient } from "../codeclarity";
import { registerListAnalyses } from "./analyses";
import { registerListProjects } from "./projects";
import { registerWhoami } from "./whoami";

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
  registerWhoami(server, client);
  registerListProjects(server, client);
  registerListAnalyses(server, client);
  return server;
}
