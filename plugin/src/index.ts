import path from "path";
import { Generator, GeneratorOptions } from "@jspm/generator";
import type { ConfigEnv, Plugin, ResolvedConfig } from "vite";

type PluginOptions = GeneratorOptions & {
  development?: boolean;
  strictInputMap?: boolean;
};

const getDefaultOptions = (env: ConfigEnv): PluginOptions => ({
  development: true,
  mapUrl: import.meta.url,
  defaultProvider: "jspm",
  env: [
    env.mode === "development" ? "development" : "production",
    "browser",
    "module",
  ],
});

let __options: PluginOptions | null = null;

const getOptions = (env: ConfigEnv, options?: PluginOptions): PluginOptions => {
  if (__options) {
    return __options;
  }
  return (__options = { ...getDefaultOptions(env), ...options });
};

let __generator: Generator | null = null;

function getGenerator(options: PluginOptions) {
  if (__generator) {
    return __generator;
  }
  return (__generator = new Generator(options));
}

function plugin(_options?: PluginOptions): Plugin[] {
  const installPromiseCache: Promise<unknown>[] = [];
  let resolvedConfig: ResolvedConfig;
  const resolvedDeps: Set<string> = new Set();
  let env: ConfigEnv;

  return [
    {
      name: "jspm:pre",
      enforce: "pre",
      config(_config, _env) {
        env = _env;
      },
      configResolved(_config) {
        resolvedConfig = _config;

        // @ts-ignore
        resolvedConfig.plugins.push({
          name: "vite-plugin-ignore-static-import-replace-idprefix",
          transform: (code, _, ctx) => {
            if (ctx?.ssr) {
              return code;
            }
            const VALID_ID_PREFIX = `/@id/`;
            const resolvedDepsRegex = new RegExp(
              `${VALID_ID_PREFIX}(${[...resolvedDeps].join("|")})`,
              "g"
            );
            return resolvedDepsRegex.test(code)
              ? code.replace(resolvedDepsRegex, (_, s1) => s1)
              : code;
          },
        } as Plugin);
      },
      async resolveId(id, _, ctx) {
        if (ctx.ssr) {
          // No plans on getting this working in SSR
          return;
        }
        if (
          id.startsWith("/") ||
          id.startsWith(".") ||
          id.startsWith("vite/") ||
          id.includes(".css") ||
          id.includes(".html") ||
          path.isAbsolute(id)
        ) {
          return null;
        }
        const options = getOptions(env, _options);
        // if true and inputMap is defined in jspm options, we skip installing deps
        if (options.strictInputMap && options.inputMap) {
          return {
            id,
            external: true,
          };
        }

        const generator = getGenerator(options);

        // if the module is resolved, ignore it, for cases like when inputMap
        // option of jspm is used
        let resolvedInInputMap = false;
        try {
          generator.resolve(id);
          resolvedInInputMap = true;
          resolvedDeps.add(id);
        } catch {}

        if (options?.development && env.command === "serve") {
          if (!resolvedInInputMap) {
            await generator.install(id);
          }
          resolvedDeps.add(id);

          return {
            id,
            external: true,
          };
        }
        if (!resolvedInInputMap) {
          installPromiseCache.push(generator.install(id));
        }

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
          const options = getOptions(env, _options);
          const generator = getGenerator(options);
          await Promise.all(installPromiseCache);
          resolvedDeps.clear()
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
                  src: "https://ga.jspm.io/npm:es-module-shims@1.5.9/dist/es-module-shims.js",
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
export { __generator as generator };
