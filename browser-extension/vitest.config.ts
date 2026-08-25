import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Standalone config for the reasoning-engine unit tests.
 *
 * These tests exercise pure calculation and reasoning code, so they don't
 * need the WXT/browser environment — only the "@" alias WXT normally provides.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
