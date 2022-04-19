import { Generator, GeneratorOptions } from "@jspm/generator";
import type { ConfigEnv, Plugin } from "vite";

type PluginOptions = GeneratorOptions & {
  development?: boolean;
};

const defaultOptions: PluginOptions = {
  development: true,
  mapUrl: import.meta.url,
  defaultProvider: "jspm",
  env: ["production", "browser", "module"],
};

function plugin(_options?: PluginOptions): Plugin[] {
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

        if (options.development && env.command === "serve") {

          await generator.install(id);

          console.log(id, generator.resolve(id))
          return { id: generator.resolve(id), external: true };
        }
        installPromiseCache.push(generator.install(id));

        return { id, external: true };
      },
    },
    {
      name: "jspm:post",
      enforce: "post",
      transformIndexHtml: {
        // NODE_ENV is "production" in `vite build`
        enforce: process.env?.NODE_ENV === "production" ? "post" : "pre",
        async transform(html) {
          await Promise.all(installPromiseCache);
          installPromiseCache.length = 0;

          return {
            html,
            tags: [
              {
                tag: "script",
                attrs: {
                  type: "importmap",
                },
                children: JSON.stringify(generator.getMap(), null, 2),
                injectTo: "head-prepend",
              },
              {
                tag: "script",
                attrs: {
                  type: "module",
                  src: "https://ga.jspm.io/npm:es-module-shims@1.4.1/dist/es-module-shims.js",
                  async: !(options.development && env.command === "serve"),
                },
                injectTo: "head-prepend",
              },
            ],
          };
        },
      },
    },
  ];
}

export default plugin;
