import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Transport } from "@modelcontextprotocol/server";
import {
  serveStdio,
  type StdioServerHandle,
} from "@modelcontextprotocol/server/stdio";
import { CodeClarityClient } from "./codeclarity";
import { type Config, configFromEnv } from "./config";
import { log, LogLevel } from "./log";
import { createServer } from "./tools/server";

/** The MCP service: one organization's tools, served on a transport. */
export class McpApp {
  private readonly client: CodeClarityClient;

  /**
   * @param config Where to read, and with which token
   * @param version The service's version, sent to MCP clients
   */
  constructor(
    private readonly config: Config,
    readonly version: string,
  ) {
    this.client = new CodeClarityClient(
      config.url,
      config.organizationId,
      config.token,
    );
  }

  /**
   * Builds the service from the CLI's variables and the package's version
   * @throws {Error} Naming every variable that is missing
   *
   * @param env The environment to read, process.env by default
   * @returns the service, not serving yet
   */
  static fromEnv(env: NodeJS.ProcessEnv = process.env): McpApp {
    return new McpApp(configFromEnv(env), packageVersion());
  }

  /**
   * Serves the tools on stdio until the MCP client closes the connection
   *
   * @param transport The transport to serve on, the process's stdio by default
   * @returns the handle that closes the connection
   */
  serveStdio(transport?: Transport): StdioServerHandle {
    const handle = serveStdio(() => createServer(this.client, this.version), {
      ...(transport === undefined ? {} : { transport }),
      onerror: (error) => {
        log(LogLevel.Error, error, {
          organizationId: this.config.organizationId,
        });
      },
    });
    log(LogLevel.Info, "serving on stdio", {
      version: this.version,
      url: this.config.url,
      organizationId: this.config.organizationId,
    });
    return handle;
  }
}

/**
 * Reads the version from package.json, one level above both src and dist
 *
 * @returns the package's version
 */
function packageVersion(): string {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf8"),
  ) as { version: string };
  return packageJson.version;
}
