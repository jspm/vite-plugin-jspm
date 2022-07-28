import path from "path";
import { Generator, GeneratorOptions, fetch } from "@jspm/generator";
import type {
  ConfigEnv,
  HtmlTagDescriptor,
  Plugin,
  ResolvedConfig,
} from "vite";

type PluginOptions = GeneratorOptions & {
  downloadDeps?: boolean;
};

const getDefaultOptions = (env: ConfigEnv): PluginOptions => ({
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
  let env: ConfigEnv;
  let resolvedConfig: ResolvedConfig;
  const resolvedDeps: Set<string> = new Set();
  const installPromiseCache: Promise<unknown>[] = [];

  return [
    {
      name: "jspm:imports-scan",
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
      async resolveId(id, importer, ctx) {
        const options = getOptions(env, _options);
        if (ctx.ssr) {
          // No plans on getting this working in SSR
          return null;
        }

        if (
          id.startsWith("/") ||
          id.startsWith(".") ||
          id.startsWith("vite/") ||
          id.startsWith("__vite") ||
          id.includes(".css") ||
          id.includes(".html") ||
          path.isAbsolute(id)
        ) {
          return;
        }

        const generator = getGenerator(options);
        try {
          generator.resolve(id);
        } catch {
          if (importer?.startsWith("http")) {
            return;
          }
          try {
            installPromiseCache.push(generator.install(id));
          } catch {}
        }

        return;
      },
    },
    {
      name: "jspm:import-mapping",
      enforce: "post",
      async resolveId(id, importer, ctx) {
        if (ctx?.ssr) {
          return null;
        }

        const options = getOptions(env, _options);
        const generator = getGenerator(options);
        let proxyPath;
        try {
          await Promise.all(installPromiseCache);
          installPromiseCache.length = 0;
        } catch {}

        if (id.startsWith("vite/") || path.isAbsolute(id)) {
          return;
        }

        if (importer?.startsWith("http") && id?.startsWith(".")) {
          proxyPath = new URL(id, importer).toString();
          if (options?.downloadDeps) {
            return { id: proxyPath, external: false };
          }
          return { id, external: true };
        }

        try {
          proxyPath = generator.resolve(id);
          resolvedDeps.add(id);
        } catch (e) {
          if (importer?.startsWith("http")) {
            proxyPath = generator.importMap.resolve(id, importer);
            resolvedDeps.add(id);
            if (options?.downloadDeps) {
              return { id: proxyPath, external: false };
            }
            return { id, external: true };
          }
        }

        if (options?.downloadDeps) {
          return { id: proxyPath, external: false };
        }

        return { id, external: true };
      },
      async load(id) {
        if (id?.startsWith("vite/") || !id?.startsWith("http")) {
          return;
        }

        const options = getOptions(env, _options);
        if (options?.downloadDeps) {
          const code = await (await fetch(id)).text();
          return code;
        }

        return;
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
          resolvedDeps.clear();

          const tags: HtmlTagDescriptor[] = [
            {
              tag: "script",
              attrs: {
                type: "module",
                src: "https://ga.jspm.io/npm:es-module-shims@1.5.9/dist/es-module-shims.js",
                async: !(env.command === "serve"),
              },
              injectTo: "head-prepend",
            },
          ];

          if (
            // only when we are in development or non-downloadDeps (prod-dev)
            !options?.downloadDeps ||
            process.env?.NODE_ENV !== "production"
          ) {
            tags.unshift({
              tag: "script",
              attrs: {
                type: "importmap",
              },
              children: JSON.stringify(generator.getMap(), null, 2),
              injectTo: "head-prepend",
            });
          }

          return {
            html,
            tags,
          };
        },
      },
    },
  ];
}

export default plugin;
export { __generator as generator };
