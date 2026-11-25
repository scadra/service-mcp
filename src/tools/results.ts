import { type CallToolResult } from "@modelcontextprotocol/server";

/**
 * Answers a tool call with a value
 *
 * @param value What the tool read
 * @returns the value as structured content, and as JSON text for clients that read only text
 */
export function jsonResult(value: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

/**
 * Says what a tool was reading when the API failed, so the assistant can tell the user
 *
 * @param what What the tool was reading, such as "organization org-1"
 * @param error The error the client threw
 * @returns the error to throw, which the SDK turns into a tool error
 */
export function readError(what: string, error: unknown): Error {
  const reason = error instanceof Error ? error.message : String(error);
  return new Error(`reading ${what}: ${reason}`, { cause: error });
}
