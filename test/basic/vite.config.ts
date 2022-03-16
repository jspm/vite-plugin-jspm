import type {} from 'vitest'
import { defineConfig } from "vite";
import jspmPlugin from 'vite-plugin-jspm'

export default defineConfig({
  plugins: [jspmPlugin()],
  test: {
    threads: false,
  },
});
