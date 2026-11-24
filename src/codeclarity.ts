/** An error answer of the API, with the message it sent. */
export class ApiError extends Error {
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

/** Reads one organization of one instance with an Organization token. */
export class CodeClarityClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    readonly organizationId: string,
    private readonly token: string,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  /** How many projects the organization has, which any read token may see. */
  async projectCount(): Promise<number> {
    const page = await this.get<Page<unknown>>(["projects"], {
      page: "0",
      entries_per_page: "1",
    });
    return page.total_entries;
  }

  /** Reads a route of the organization, such as get(["projects", id]). */
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

  private orgPath(parts: string[]): string {
    return ["/org", this.organizationId, ...parts]
      .map((part, i) => (i === 0 ? part : encodeURIComponent(part)))
      .join("/");
  }
}

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
