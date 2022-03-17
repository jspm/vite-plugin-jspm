import { Generator, GeneratorOptions } from "@jspm/generator";
import type { ConfigEnv, PluginOption } from "vite";

/*
 * shimgs in dev mode does not work with jspm since vite injects client/env and vite/client,
 * which es-module-shims complains about (An import map is added after module script load was triggered.)
 *
 * jspm/es-module-shims also has problem with index.tsx files (+ those who are mentioned in the html file), so ignoring would also be a solution for these
 *
 * TODO: solution would be a way to make jspm & es-module-shims ignore some urls
 */

const defaultOptions: GeneratorOptions = {
  mapUrl: import.meta.url,
  defaultProvider: "jspm", // this is the default defaultProvider
  // Always ensure to define your target environment to get a working map
  // it is advisable to pass the "module" condition as supported by Webpack
  env: ["production", "browser", "module"],
};

function plugin(_options?: GeneratorOptions): PluginOption[] {
  const options = Object.assign(defaultOptions, _options);
  const generator = new Generator(options);
  const installPromiseCache: Promise<unknown>[] = [];
  let env: ConfigEnv;

  return [
    {
      name: "jspm:pre",
      enforce: "pre",
      config(_, _env) {
        env = _env;
      },
      async resolveId(id) {
        if (
          id.startsWith("/") ||
          id.startsWith(".") ||
          id.includes(".css") ||
          id.includes(".html")
        ) {
          return null;
        }

        if (env.command === "serve") {
          await generator.install(id);

          return { id: generator.importMap.resolve(id), external: true };
        }

        installPromiseCache.push(generator.install(id));

        return { id, external: true };
      },
    },
    {
      name: "jspm:post",
      enforce: "post",
      async transformIndexHtml(html) {
        if (env.command === "serve") {
          return;
        }

        await Promise.all(installPromiseCache);
        installPromiseCache.length = 0;

        const importMapScriptTag = `<script async src="https://ga.jspm.io/npm:es-module-shims@1.4.1/dist/es-module-shims.js"></script>
<script type="importmap">${JSON.stringify(
          generator.getMap(),
          null,
          2
        )}</script>`;

        return html.replace("<head>", "<head>" + importMapScriptTag);
      },
    },
  ];
}

export default plugin;
