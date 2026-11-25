/** An error answer of the API, with the message it sent. */
export class ApiError extends Error {
  /**
   * Builds the message from what the API sent, keeping only the parts it gave
   *
   * @param status The HTTP status
   * @param code The API's error_code, or "" when it sent none
   * @param apiMessage The API's error_message, or "" when it sent none
   */
  constructor(
    readonly status: number,
    readonly code: string,
    readonly apiMessage: string,
  ) {
    super(
      code !== "" && apiMessage !== ""
        ? `${apiMessage} (HTTP ${String(status)}, ${code})`
        : apiMessage !== ""
          ? `${apiMessage} (HTTP ${String(status)})`
          : `HTTP ${String(status)}`,
    );
    this.name = "ApiError";
  }
}

/** One page of a paginated answer. */
export interface Page<T> {
  data: T[];
  page: number;
  total_pages: number;
  total_entries: number;
}

/** An analysis of a project, without its plugins' results. */
export interface AnalysisSummary {
  id: string;
  status: string;
  branch: string;
  tag: string | null;
  created_on: string;
  failure_reason: string | null;
}

/** A project of the organization, with its analyses. */
export interface Project {
  id: string;
  name: string;
  // FILE for an upload, or the host of a linked repository, such as GITHUB.
  type: string;
  url: string;
  default_branch: string;
  added_on: string;
  analyses: AnalysisSummary[];
}

/** Reads one organization of one instance with an Organization token. */
export class CodeClarityClient {
  private readonly baseUrl: string;

  /**
   * @param baseUrl The API's base URL, such as https://codeclarity.example.com/api
   * @param organizationId The id of the organization every call reads
   * @param token The Organization token, sent as a Bearer token
   */
  constructor(
    baseUrl: string,
    readonly organizationId: string,
    private readonly token: string,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  /**
   * Counts the organization's projects, which any read token may see
   * @throws {ApiError} If the API refuses the token or the call
   *
   * @returns the number of projects of the organization
   */
  async projectCount(): Promise<number> {
    const page = await this.get<Page<unknown>>(["projects"], {
      page: "0",
      entries_per_page: "1",
    });
    return page.total_entries;
  }

  /**
   * Lists the organization's projects
   * @throws {ApiError} If the API refuses the token or the call
   *
   * @param search Only the projects whose name contains this text, or every project
   * @returns the projects, each with its analyses
   */
  async projects(search?: string): Promise<Project[]> {
    return this.all<Project>(
      ["projects"],
      search === undefined ? {} : { search_key: search },
    );
  }

  /**
   * Lists the analyses of a project
   * @throws {ApiError} If the API refuses the token, or the project is not the organization's
   *
   * @param projectId The id of the project
   * @returns the project's analyses, in the API's order
   */
  async analyses(projectId: string): Promise<AnalysisSummary[]> {
    return this.all<AnalysisSummary>(["projects", projectId, "analyses"]);
  }

  /**
   * Reads every page of a paginated route of the organization
   * @throws {ApiError} If the API answers with an error status
   *
   * @param parts The path segments after /org/{organizationId}
   * @param query The query parameters, without page and entries_per_page
   * @returns the items of every page, in the API's order
   */
  private async all<T>(
    parts: string[],
    query: Record<string, string> = {},
  ): Promise<T[]> {
    const items: T[] = [];
    for (let page = 0; ; page++) {
      const answer = await this.get<Page<T>>(parts, {
        ...query,
        page: String(page),
        entries_per_page: "100",
      });
      items.push(...answer.data);
      if (page + 1 >= answer.total_pages) {
        return items;
      }
    }
  }

  /**
   * Reads a route of the organization, such as get(["projects", id])
   * @throws {ApiError} If the API answers with an error status
   * @throws {Error} If the answer is not JSON
   *
   * @param parts The path segments after /org/{organizationId}, each one encoded
   * @param query The query parameters
   * @returns the API's answer, parsed as JSON
   */
  private async get<T>(
    parts: string[],
    query: Record<string, string> = {},
  ): Promise<T> {
    const path = this.orgPath(parts);
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      signal: AbortSignal.timeout(60_000),
    });
    const body = await response.text();
    if (!response.ok) {
      throw errorOf(response.status, body);
    }
    try {
      return JSON.parse(body) as T;
    } catch (error) {
      throw new Error(`GET ${path}: unexpected answer`, { cause: error });
    }
  }

  /**
   * Builds the path of an organization route
   *
   * @param parts The path segments after /org/{organizationId}
   * @returns the path, with the organization id and every segment encoded
   */
  private orgPath(parts: string[]): string {
    return ["/org", this.organizationId, ...parts]
      .map((part, index) => (index === 0 ? part : encodeURIComponent(part)))
      .join("/");
  }
}

/**
 * Turns an error answer into an ApiError, keeping what the API explained
 *
 * @param status The HTTP status
 * @param body The answer's body, JSON or not
 * @returns the error, with error_code and error_message when the body has them
 */
function errorOf(status: number, body: string): ApiError {
  try {
    const answer = JSON.parse(body) as {
      error_code?: unknown;
      error_message?: unknown;
    };
    return new ApiError(
      status,
      typeof answer.error_code === "string" ? answer.error_code : "",
      typeof answer.error_message === "string" ? answer.error_message : "",
    );
  } catch {
    return new ApiError(status, "", "");
  }
}
