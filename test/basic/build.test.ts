import sirv from "sirv";
import puppeteer from "puppeteer";
import { build, preview, PreviewServer } from "vite";
import { describe, afterAll, beforeAll, expect, test } from "vitest";

const url = "http://localhost:3000";

describe("build", async () => {
  await build({ configFile: "./vite.config.ts" });
  let server: PreviewServer;

  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  beforeAll(async () => {
    server = await preview({
      configFile: "./vite.config.ts",
      preview: { open: false, port: 3000 },
    });
    server.printUrls();

    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  test("basic render", async () => {
    await page.goto(url);
    expect(await page.content()).toContain("Hello, world!");
  });

  test("contains importmap", async () => {
    expect(await page.content()).toContain('<script type="importmap">');

    expect(await page.content()).toContain(`{
  "imports": {
    "react": "https://ga.jspm.io/npm:react@17.0.2/index.js",
    "react-dom": "https://ga.jspm.io/npm:react-dom@17.0.2/index.js"
  },
  "scopes": {
    "https://ga.jspm.io/": {
      "object-assign": "https://ga.jspm.io/npm:object-assign@4.1.1/index.js",
      "scheduler": "https://ga.jspm.io/npm:scheduler@0.20.2/index.js"
    }
  }
}`);

  expect(await page.content()).toMatchSnapshot()
  });

  afterAll(async () => {
    await browser.close();
    server.httpServer.close();
  });
});
