import { fileURLToPath } from "url";

export const sleep = (num: number) =>
  new Promise((res) => setTimeout(res, num));

export const __dirname = fileURLToPath(new URL(".", import.meta.url));
