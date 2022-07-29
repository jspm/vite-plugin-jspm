import path from "path";
import puppeteer from "puppeteer";
import { build, preview, PreviewServer } from "vite";
import { describe, afterAll, beforeAll, expect, test } from "vitest";
import { sleep } from "./utils";

const url = "http://localhost:3002";

describe("build", async () => {
  await build({
    configFile: path.resolve(__dirname, "./vite-download.config.mjs"),
  });
  let server: PreviewServer;

  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  beforeAll(async () => {
    server = await preview({
      configFile: "./vite-download.config.mjs",
      preview: { open: false, port: 3002 },
    });
    server.printUrls();

    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  test("basic render", async () => {
    await page.goto(url);
    await sleep(1000);
    const content = await page.content();

    expect(content).toContain("Hello, world!");
    expect(content).not.toContain("importmap");
  });

  afterAll(async () => {
    await browser.close();
    server.httpServer.close();
  });
});
