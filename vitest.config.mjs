import { defineConfig } from "vitest/config";

export default defineConfig({
  // Puts back every global a test stubbed, such as fetch.
  test: { unstubGlobals: true },
});
