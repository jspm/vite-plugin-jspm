import puppeteer from "puppeteer";
import { build, preview, PreviewServer } from "vite";
import { describe, afterAll, beforeAll, expect, test } from "vitest";
import { sleep } from "./utils";

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
    await sleep(500);

    expect(await page.content()).toContain("Hello, world!");
  });

  afterAll(async () => {
    await browser.close();
    server.httpServer.close();
  });
});
