import puppeteer from "puppeteer";
import { build, preview, PreviewServer } from "vite";
import { describe, afterAll, beforeAll, expect, test } from "vitest";

const url = "http://localhost:3000";
const sleep = (num: number) => new Promise((res) => setTimeout(res, num));

describe("Dev with downloadDeps options", async () => {
  let server: PreviewServer;

  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  beforeAll(async () => {
    server = await preview({
      configFile: "./vite-download.config.ts",
      server: { port: 3000 },
    });
    server.printUrls();

    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  test("Loads the deps from CDN, even if downdloadDeps is passed", async () => {
    await page.goto(url);
    await sleep(1000);
    console.log(await page.content());
    // expect(await page.content()).toContain("<h1>Hello, world!</h1>");
  });

  afterAll(async () => {
    await browser.close();
    server.httpServer.close();
  });
});
