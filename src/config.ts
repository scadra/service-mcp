/** Where the server reads, and with which Organization token (scope read). */
export interface Config {
  // The API's base URL, such as https://codeclarity.example.com/api.
  url: string;
  organizationId: string;
  token: string;
}

/**
 * Reads the same variables as the codeclarity CLI
 * @throws {Error} Naming every variable that is missing
 *
 * @param env The environment to read, process.env by default
 * @returns the configuration, with the URL's trailing slashes removed
 */
export function configFromEnv(env: NodeJS.ProcessEnv = process.env): Config {
  const config: Config = {
    url: (env["CODECLARITY_URL"] ?? "").replace(/\/+$/, ""),
    organizationId: env["CODECLARITY_ORG"] ?? "",
    token: env["CODECLARITY_TOKEN"] ?? "",
  };
  const missing = [
    ["CODECLARITY_ORG", config.organizationId],
    ["CODECLARITY_TOKEN", config.token],
    ["CODECLARITY_URL", config.url],
  ]
    .filter(([, value]) => value === "")
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`set ${missing.join(", ")}`);
  }
  return config;
}
