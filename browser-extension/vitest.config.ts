import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Standalone config for the unit tests.
 *
 * These exercise pure calculation, reasoning and parsing code, so they don't
 * need the WXT/browser environment — only the "@" alias WXT normally provides.
 * Content-script modules are in scope on the same terms: a test may import one
 * only if it reaches no browser API at module level.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "entrypoints/**/*.test.ts"],
  },
});
