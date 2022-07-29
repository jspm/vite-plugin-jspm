import { defineConfig } from "vite";
import jspmPlugin from "../../plugin/dist/index.js";

export default defineConfig({
  plugins: [jspmPlugin({ downloadDeps: true })],
  build: { polyfillModulePreload: false, polyfillDynamicImport: false },
});
