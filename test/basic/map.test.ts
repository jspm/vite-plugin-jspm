import { rm } from "fs/promises";
import path from "path";
import type { RollupOutput } from "rollup";
import { build, UserConfig } from "vite";
import { describe, beforeAll, expect, test } from "vitest";
import jspmPlugin from "../../plugin/dist/index.js";
import {
  getFileFromOutput,
  loadURLAndParseContent,
  mockImportMap,
  __dirname,
} from "./utils";

const buildPath = path.resolve(__dirname, "build");
const config: UserConfig = {
  clearScreen: true,
  build: {
    outDir: buildPath,
    rollupOptions: {
      output: {
        chunkFileNames: "[name].js",
        entryFileNames: "[name].js",
      },
    },
  },
  plugins: [],
};

describe("build", async () => {
  beforeAll(async () => {
    await rm(buildPath, {
      recursive: true,
      force: true,
    });
  });

  test("Parses vite-build, and generates importmap", async () => {
    config.plugins = [await jspmPlugin()];
    const { output } = (await build(config)) as RollupOutput;

    const indexHTML = getFileFromOutput(output, "index.html");
    const indexJS = getFileFromOutput(output, "index.js");
    const content = await loadURLAndParseContent(buildPath);

    expect(output).toBeDefined();
    expect(indexHTML).toBeDefined();
    expect(indexHTML).toContain(`npm:es-module-shims`);
    expect(indexHTML).toContain("importmap");
    expect(indexHTML).toContain(`https://ga.jspm.io/npm:react`);
    expect(indexJS).toContain(`from"react"`);
    expect(content).toContain(`<h1>Hello, world!</h1>`);
  });

  test("Parses vite-build, but uses input import-map and install new ones that are missing", async () => {
    config.plugins = [await jspmPlugin({ inputMap: mockImportMap() })];
    const { output } = (await build(config)) as RollupOutput;

    const indexHTML = getFileFromOutput(output, "index.html");
    const indexJS = getFileFromOutput(output, "index.js");
    const content = await loadURLAndParseContent(buildPath);

    expect(output).toBeDefined();
    expect(indexHTML).toBeDefined();
    expect(indexHTML).toContain(`npm:es-module-shims`);
    expect(indexHTML).toContain("importmap");
    expect(indexJS).toContain(`from"react"`);
    expect(content).toContain(`<h1>Hello, world!</h1>`);
    expect(content).toContain(`<p>Loading 17.0.2</p>`);
    /**
     * Vite build run in production mode, so even if inputMap has `dev` version of deps.
     * The plugin will re-map with `prod` version of the same deps with the same version
     */
    expect(indexHTML).toContain(
      '"react": "https://ga.jspm.io/npm:react@17.0.2/index.js'
    );
  });

  test("Parses vite-build and download the deps too into local and add them to build", async () => {
    config.plugins = [await jspmPlugin({ downloadDeps: true })];
    const { output } = (await build(config)) as RollupOutput;

    const indexHTML = getFileFromOutput(output, "index.html");
    const indexJS = getFileFromOutput(output, "index.js");
    const content = await loadURLAndParseContent(buildPath);

    expect(output).toBeDefined();
    expect(indexHTML).toBeDefined();
    expect(indexHTML).toContain(`npm:es-module-shims`);
    expect(indexHTML).not.toContain("importmap");
    expect(indexHTML).not.toContain(`https://ga.jspm.io/npm:react`);
    expect(indexJS).not.toContain(`from"react"`);
    expect(content).toContain(`<h1>Hello, world!</h1>`);
  });

  test("Parses vite-build, but uses input import-map and adds them to the build", async () => {
    config.plugins = [
      await jspmPlugin({ inputMap: mockImportMap(), downloadDeps: true }),
    ];
    const { output } = (await build(config)) as RollupOutput;

    const indexHTML = getFileFromOutput(output, "index.html");
    const indexJS = getFileFromOutput(output, "index.js");
    const content = await loadURLAndParseContent(buildPath);

    expect(output).toBeDefined();
    expect(indexHTML).toBeDefined();
    expect(indexHTML).toContain(`npm:es-module-shims`);
    expect(indexHTML).not.toContain("importmap");
    expect(indexHTML).not.toContain(`https://ga.jspm.io/npm:react`);
    expect(indexJS).not.toContain(`from"react"`);
    expect(content).toContain(`<h1>Hello, world!</h1>`);
    expect(content).toContain(`<p>Loading 17.0.2</p>`);
  });

  test("Parses vite-build always resolves react and react-dom to 17.0.2", async () => {
    config.plugins = [
      await jspmPlugin({
        resolutions: { react: "17.0.2", "react-dom": "17.0.2" },
      }),
    ];
    const { output } = (await build(config)) as RollupOutput;

    const indexHTML = getFileFromOutput(output, "index.html");
    const indexJS = getFileFromOutput(output, "index.js");
    const content = await loadURLAndParseContent(buildPath);

    expect(output).toBeDefined();
    expect(indexHTML).toBeDefined();
    expect(indexHTML).toContain(`npm:es-module-shims`);
    expect(indexHTML).toContain("importmap");
    expect(indexHTML).toContain(`https://ga.jspm.io/npm:react`);
    expect(indexJS).toContain(`from"react"`);
    expect(content).toContain(`<h1>Hello, world!</h1>`);
    expect(content).toContain(`<p>Loading 17.0.2</p>`);
  });
});
