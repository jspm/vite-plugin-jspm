import type {} from "vitest";
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    testTimeout: 10000,
  },
});
