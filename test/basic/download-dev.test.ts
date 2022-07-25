import puppeteer from "puppeteer";
import { createServer, ViteDevServer } from "vite";
import { describe, afterAll, beforeAll, expect, test } from "vitest";

const sleep = (num: number) => new Promise((res) => setTimeout(res, num));
const url = "http://localhost:3000";

describe("Dev with downloadDeps options", async () => {
  let server: ViteDevServer;

  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  beforeAll(async () => {
    server = await createServer({
      configFile: "./vite-download.config.ts",
      server: { port: 3000 },
    });
    server.printUrls();
    await server.listen();

    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  test("Loads the deps from CDN, even if downdloadDeps is passed", async () => {
    await page.goto(url);
    await sleep(500);
    expect(await page.content()).toContain("Hello, world!");
  });

  afterAll(async () => {
    await browser.close();
    server.close();
  });
});
