import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { log, LogLevel } from "./log";

describe("log", () => {
  it("writes one JSON line with the level, message and fields", () => {
    const stream = new PassThrough();
    let written = "";
    stream.on("data", (chunk: Buffer) => {
      written += chunk.toString();
    });

    log(LogLevel.Info, "serving on stdio", { organizationId: "org-1" }, stream);

    expect(written.endsWith("\n")).toBe(true);
    expect(JSON.parse(written)).toMatchObject({
      level: "info",
      service: "service-mcp",
      message: "serving on stdio",
      organizationId: "org-1",
    });
  });

  it("logs an error caught by its message", () => {
    const stream = new PassThrough();
    let written = "";
    stream.on("data", (chunk: Buffer) => {
      written += chunk.toString();
    });

    log(LogLevel.Error, new Error("set CODECLARITY_TOKEN"), {}, stream);

    expect(JSON.parse(written)).toMatchObject({
      level: "error",
      message: "set CODECLARITY_TOKEN",
    });
  });
});
