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

/** One vulnerability an analysis found, with every dependency it affects. */
export interface Finding {
  Vulnerability: string;
  Severity: { Severity: number; SeverityClass: string };
  Affected: { AffectedDependency: string; AffectedVersion: string }[];
  Description: string;
}

/** A license an analysis found, with the dependencies under it. */
export interface License {
  id: string;
  name: string;
  license_category: string;
  license_compliance_violation: boolean;
  unable_to_infer: boolean;
  deps_using_license: string[];
}

/** One dependency of an analysis's workspace, as the SBOM records it. */
export interface Dependency {
  name: string;
  version: string;
  latest_version: string;
  license: string;
  direct: boolean;
  transitive: boolean;
  release_date: string;
  lastest_release_date: string;
  vulnerabilities: string[];
  severity_dist: Record<string, number>;
}

/** A node of the dependency graph: a dependency, and the ones that import it. */
export interface GraphNode {
  // name@version, or __VIRTUAL_ROOT__ for the workspace itself.
  id: string;
  parentIds: string[];
  prod: boolean;
  dev: boolean;
}

/** One upgrade that fixes vulnerabilities, and where to make it. */
export interface Fix {
  rank: {
    severity_class: string;
    known_exploited: boolean;
    high_epss: boolean;
  };
  // upgrade_direct, or force_version for a transitive dependency.
  kind: string;
  package: string;
  target_version: string;
  potentially_breaking: boolean;
  vulnerability_id: string;
  vulnerability_count: number;
  project_count: number;
  remediations: {
    project_id: string;
    project_name: string;
    workspace: string;
    command: string;
  }[];
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
   * Lists the vulnerabilities an analysis found in a workspace
   * @throws {ApiError} If the API refuses the token, or the analysis is not the organization's
   *
   * @param projectId The id of the project
   * @param analysisId The id of one of its analyses
   * @param workspace The workspace, such as "." for the project's root
   * @returns the findings, in the API's order
   */
  async findings(
    projectId: string,
    analysisId: string,
    workspace: string,
  ): Promise<Finding[]> {
    return this.all<Finding>(
      ["projects", projectId, "analysis", analysisId, "vulnerabilities"],
      { workspace },
    );
  }

  /**
   * Lists the licenses an analysis found in a workspace
   * @throws {ApiError} If the API refuses the token, or the analysis is not the organization's
   *
   * @param projectId The id of the project
   * @param analysisId The id of one of its analyses
   * @param workspace The workspace, such as "." for the project's root
   * @returns the licenses, each with the dependencies under it
   */
  async licenses(
    projectId: string,
    analysisId: string,
    workspace: string,
  ): Promise<License[]> {
    return this.all<License>(
      ["projects", projectId, "analysis", analysisId, "licenses"],
      { workspace },
    );
  }

  /**
   * Reads one dependency of an analysis's workspace
   * @throws {ApiError} If the API refuses the token, or the workspace has no such dependency
   *
   * @param projectId The id of the project
   * @param analysisId The id of one of its analyses
   * @param workspace The workspace, such as "." for the project's root
   * @param dependency The dependency, as name@version
   * @returns the dependency
   */
  async dependency(
    projectId: string,
    analysisId: string,
    workspace: string,
    dependency: string,
  ): Promise<Dependency> {
    const answer = await this.get<{ data: Dependency }>(
      ["projects", projectId, "analysis", analysisId, "sbom", "dependency"],
      { workspace, dependency },
    );
    return answer.data;
  }

  /**
   * Reads the part of the dependency graph that leads from the workspace to one dependency
   * @throws {ApiError} If the API refuses the token, or the workspace has no such dependency
   *
   * @param projectId The id of the project
   * @param analysisId The id of one of its analyses
   * @param workspace The workspace, such as "." for the project's root
   * @param dependency The dependency, as name@version
   * @returns the dependency's node and the nodes of every dependency that leads to it
   */
  async dependencyGraph(
    projectId: string,
    analysisId: string,
    workspace: string,
    dependency: string,
  ): Promise<GraphNode[]> {
    const answer = await this.get<{ data: GraphNode[] }>(
      [
        "projects",
        projectId,
        "analysis",
        analysisId,
        "sbom",
        "dependency",
        "graph",
      ],
      { workspace, dependency },
    );
    return answer.data;
  }

  /**
   * Ranks the organization's upgrades by how much each one fixes
   * @throws {ApiError} If the API refuses the token or the limit
   *
   * @param limit How many upgrades to return, 1 to 50
   * @returns the upgrades, the one that fixes the most first
   */
  async fixNext(limit: number): Promise<Fix[]> {
    const answer = await this.get<{ data: Fix[] }>(
      ["remediations", "fix-next"],
      { limit: String(limit) },
    );
    return answer.data;
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
