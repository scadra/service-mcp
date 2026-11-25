import { type McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { ReadOnlyTool } from "./tool";

/** whoami: checks the token works and names the organization every tool reads. */
export class WhoamiTool extends ReadOnlyTool {
  /**
   * Registers whoami on a server
   *
   * @param server The server to register the tool on
   */
  register(server: McpServer): void {
    server.registerTool(
      "whoami",
      {
        description:
          "Check the token works and name the organization every tool reads, with its number of projects.",
        outputSchema: z.object({
          organization_id: z
            .string()
            .describe("the organization every tool reads"),
          projects: z
            .number()
            .describe("how many projects the organization has"),
        }),
        annotations: this.annotations("Who am I"),
      },
      async () => {
        const projects = await this.client
          .projectCount()
          .catch((error: unknown) => {
            throw this.readError(
              `organization ${this.client.organizationId}`,
              error,
            );
          });
        return this.result({
          organization_id: this.client.organizationId,
          projects,
        });
      },
    );
  }
}
