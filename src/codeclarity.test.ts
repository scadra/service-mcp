import { createServer, type IncomingMessage, type Server } from "node:http";
import { type AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { ApiError, CodeClarityClient } from "./codeclarity";

let server: Server | undefined;

/**
 * Starts an API that answers with status and body, and records the requests
 *
 * @param status The HTTP status of every answer
 * @param body The body of every answer, or the bodies in turn, the last one repeated
 * @returns the API's URL and the requests it received
 */
async function fakeApi(
  status: number,
  body: string | string[],
): Promise<{ url: string; requests: IncomingMessage[] }> {
  const bodies = typeof body === "string" ? [body] : body;
  const requests: IncomingMessage[] = [];
  server = createServer((request, response) => {
    requests.push(request);
    const answer = bodies[Math.min(requests.length, bodies.length) - 1] ?? "";
    response
      .writeHead(status, { "Content-Type": "application/json" })
      .end(answer);
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${String(port)}`, requests };
}

afterEach(() => {
  server?.close();
});

describe("CodeClarityClient", () => {
  it("sends the token and reads the number of projects", async () => {
    const api = await fakeApi(
      200,
      '{"data":[{"id":"p1"}],"page":0,"total_pages":3,"total_entries":3}',
    );

    const projects = await new CodeClarityClient(
      `${api.url}/`,
      "org/1",
      "ccot_test",
    ).projectCount();

    expect(projects).toBe(3);
    expect(api.requests[0]?.url).toBe(
      "/org/org%2F1/projects?page=0&entries_per_page=1",
    );
    expect(api.requests[0]?.headers.authorization).toBe("Bearer ccot_test");
  });

  it("reads every page of the projects", async () => {
    const api = await fakeApi(200, [
      '{"data":[{"id":"p1"}],"page":0,"total_pages":2,"total_entries":2}',
      '{"data":[{"id":"p2"}],"page":1,"total_pages":2,"total_entries":2}',
    ]);

    const projects = await new CodeClarityClient(
      api.url,
      "org-1",
      "ccot_test",
    ).projects("app");

    expect(projects.map((project) => project.id)).toEqual(["p1", "p2"]);
    expect(api.requests.map((request) => request.url)).toEqual([
      "/org/org-1/projects?search_key=app&page=0&entries_per_page=100",
      "/org/org-1/projects?search_key=app&page=1&entries_per_page=100",
    ]);
  });

  it("keeps the API's error message", async () => {
    const api = await fakeApi(
      403,
      '{"error_code":"NotAuthorized","error_message":"Not authorized"}',
    );

    const error = await new CodeClarityClient(api.url, "org-1", "ccot_test")
      .projectCount()
      .catch((error: unknown) => error);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(403);
    expect((error as ApiError).message).toBe(
      "Not authorized (HTTP 403, NotAuthorized)",
    );
  });

  it("says which route gave an answer that is not JSON", async () => {
    const api = await fakeApi(200, "<html>");

    await expect(
      new CodeClarityClient(api.url, "org-1", "ccot_test").projectCount(),
    ).rejects.toThrow("GET /org/org-1/projects: unexpected answer");
  });
});
