import { fileURLToPath } from "url";
import puppeteer from "puppeteer";
import { preview } from "vite";
import type { RollupOutput } from "rollup";

export const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const loadURLAndParseContent = async (
  folder = "build",
  port = 3001
): Promise<string> => {
  const server = await preview({
    build: {
      outDir: folder,
    },
    server: { base: "/" },
    preview: { port, open: false },
  });

  const browser = puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await (await browser).newPage();
  await page.goto(`http://localhost:${port}`);
  await page.waitForNetworkIdle();
  const content = await page.content();
  await (await browser).close();
  server.httpServer.close();
  return content;
};

export const getFileFromOutput = (
  output: RollupOutput["output"],
  fileName: string
): string | null => {
  const file = output.find((file) => file.fileName.includes(fileName));

  if (!file) {
    return null;
  }

  if (file.type == "asset") {
    return file.source instanceof Uint8Array
      ? file.source.toString()
      : file.source;
  }

  return file.code;
};

export const mockImportMap = () => ({
  imports: {
    react: "https://ga.jspm.io/npm:react@17.0.2/dev.index.js",
    "react-dom": "https://ga.jspm.io/npm:react-dom@17.0.2/dev.index.js",
  },
  scopes: {
    "https://ga.jspm.io/": {
      "object-assign": "https://ga.jspm.io/npm:object-assign@4.1.1/index.js",
      scheduler: "https://ga.jspm.io/npm:scheduler@0.20.2/dev.index.js",
      "scheduler/tracing":
        "https://ga.jspm.io/npm:scheduler@0.20.2/dev.tracing.js",
    },
  },
});
