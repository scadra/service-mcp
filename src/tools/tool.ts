import {
  type CallToolResult,
  type McpServer,
  type ToolAnnotations,
} from "@modelcontextprotocol/server";
import { type CodeClarityClient } from "../codeclarity";

/** A tool that changes nothing and reads only the organization, through the client. */
export abstract class ReadOnlyTool {
  /**
   * @param client The client the tool reads through
   */
  constructor(protected readonly client: CodeClarityClient) {}

  /**
   * Registers the tool on a server
   *
   * @param server The server to register the tool on
   */
  abstract register(server: McpServer): void;

  /**
   * Marks the tool as read-only, so a client may call it without asking the user
   *
   * @param title The tool's name as a client shows it
   * @returns the annotations of a read-only tool
   */
  protected annotations(title: string): ToolAnnotations {
    return {
      title,
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    };
  }

  /**
   * Answers a tool call with a value
   *
   * @param value What the tool read
   * @returns the value as structured content, and as JSON text for clients that read only text
   */
  protected result(value: Record<string, unknown>): CallToolResult {
    return {
      content: [{ type: "text", text: JSON.stringify(value) }],
      structuredContent: value,
    };
  }

  /**
   * Says what the tool was reading when the API failed, so the assistant can tell the user
   *
   * @param what What the tool was reading, such as "organization org-1"
   * @param error The error the client threw
   * @returns the error to throw, which the SDK turns into a tool error
   */
  protected readError(what: string, error: unknown): Error {
    const reason = error instanceof Error ? error.message : String(error);
    return new Error(`reading ${what}: ${reason}`, { cause: error });
  }
}
