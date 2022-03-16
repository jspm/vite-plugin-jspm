import type {} from "vitest";
import { defineConfig } from "vite";
import jspmPlugin from "vite-plugin-jspm";

export default defineConfig({
  plugins: [jspmPlugin()],
  build: { polyfillModulePreload: false, polyfillDynamicImport: false },
  test: {
    threads: false,
  },
});
