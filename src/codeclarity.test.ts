import { createServer, type IncomingMessage, type Server } from "node:http";
import { type AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { ApiError, CodeClarityClient } from "./codeclarity.js";

let server: Server | undefined;

/** Starts an API that answers every request with status and body, and records the requests. */
async function fakeApi(
  status: number,
  body: string,
): Promise<{ url: string; requests: IncomingMessage[] }> {
  const requests: IncomingMessage[] = [];
  server = createServer((req, res) => {
    requests.push(req);
    res.writeHead(status, { "Content-Type": "application/json" }).end(body);
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

    const n = await new CodeClarityClient(
      `${api.url}/`,
      "org/1",
      "ccot_test",
    ).projectCount();

    expect(n).toBe(3);
    expect(api.requests[0]?.url).toBe(
      "/org/org%2F1/projects?page=0&entries_per_page=1",
    );
    expect(api.requests[0]?.headers.authorization).toBe("Bearer ccot_test");
  });

  it("keeps the API's error message", async () => {
    const api = await fakeApi(
      403,
      '{"error_code":"NotAuthorized","error_message":"Not authorized"}',
    );

    const error = await new CodeClarityClient(api.url, "org-1", "ccot_test")
      .projectCount()
      .catch((e: unknown) => e);

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
