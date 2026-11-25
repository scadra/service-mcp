import { describe, expect, it } from "vitest";
import { configFromEnv } from "./config";

describe("configFromEnv", () => {
  it("reads the CLI's variables", () => {
    const config = configFromEnv({
      CODECLARITY_URL: "https://cc.example.com/api/",
      CODECLARITY_ORG: "org-1",
      CODECLARITY_TOKEN: "ccot_test",
    });

    expect(config).toEqual({
      url: "https://cc.example.com/api",
      organizationId: "org-1",
      token: "ccot_test",
    });
  });

  it("names what is missing", () => {
    expect(() =>
      configFromEnv({ CODECLARITY_URL: "https://cc.example.com/api" }),
    ).toThrow("set CODECLARITY_ORG, CODECLARITY_TOKEN");
  });
});
