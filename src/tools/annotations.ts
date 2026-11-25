import { type ToolAnnotations } from "@modelcontextprotocol/server";

/**
 * Marks a tool that changes nothing and reads only the instance
 *
 * @param title The tool's name as a client shows it
 * @returns the annotations of a read-only tool
 */
export function readOnly(title: string): ToolAnnotations {
  return {
    title,
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  };
}
