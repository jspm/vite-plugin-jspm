import { defineConfig } from "vite";
import jspmPlugin from "vite-plugin-jspm";

export default defineConfig({
  plugins: [jspmPlugin({ development: true, downloadDeps: true })],
  build: { polyfillModulePreload: false, polyfillDynamicImport: false },
});
