import path from "path";
import puppeteer from "puppeteer";
import { createServer, ViteDevServer } from "vite";
import { describe, afterAll, beforeAll, expect, test } from "vitest";
import { sleep } from "./utils";

const url = "http://localhost:3003";

describe("dev", async () => {
  let server: ViteDevServer;

  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  beforeAll(async () => {
    server = await createServer({
      configFile: path.resolve(__dirname, "./vite-download.config.mjs"),
      server: { port: 3003 },
    });
    server.printUrls();
    await server.listen();

    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  // in dev, page should just render
  test("basic render", async () => {
    await page.goto(url);
    await sleep(1000);
    const content = await page.content();

    const hasRendered = content.includes("Hello, world!");
    const hasImportMap = content.includes("importmap");

    expect(hasImportMap).toBe(true);
    expect(hasRendered).toBe(true);
  });

  afterAll(async () => {
    await browser.close();
    server.close();
  });
});
