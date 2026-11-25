/** How serious a log line is. */
export const LogLevel = {
  Error: "error",
  Warn: "warn",
  Info: "info",
  Debug: "debug",
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Writes one log line as JSON to stderr, since stdout carries the MCP messages
 *
 * @param level How serious the line is
 * @param message What happened: a text, or an error caught, whose message is used
 * @param fields Context, such as organizationId; never a token
 * @param stream Where to write, stderr by default
 */
export function log(
  level: LogLevel,
  message: unknown,
  fields: Record<string, unknown> = {},
  stream: NodeJS.WritableStream = process.stderr,
): void {
  const line = {
    time: new Date().toISOString(),
    level,
    service: "service-mcp",
    message: message instanceof Error ? message.message : String(message),
    ...fields,
  };
  stream.write(`${JSON.stringify(line)}\n`);
}
