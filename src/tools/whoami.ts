import { type McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { type CodeClarityClient } from "../codeclarity";
import { readOnly } from "./annotations";

/**
 * Registers whoami, which checks the token works and names the organization every tool reads
 *
 * @param server The server to register the tool on
 * @param client The client the tool reads through
 */
export function registerWhoami(
  server: McpServer,
  client: CodeClarityClient,
): void {
  server.registerTool(
    "whoami",
    {
      description:
        "Check the token works and name the organization every tool reads, with its number of projects.",
      outputSchema: z.object({
        organization_id: z
          .string()
          .describe("the organization every tool reads"),
        projects: z.number().describe("how many projects the organization has"),
      }),
      annotations: readOnly("Who am I"),
    },
    async () => {
      const projects = await client.projectCount().catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
          `reading organization ${client.organizationId}: ${reason}`,
          { cause: error },
        );
      });
      const identity = { organization_id: client.organizationId, projects };
      return {
        content: [{ type: "text", text: JSON.stringify(identity) }],
        structuredContent: identity,
      };
    },
  );
}
