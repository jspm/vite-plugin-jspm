import path from "path";
import { Generator, GeneratorOptions, fetch } from "@jspm/generator";
import type {
  ConfigEnv,
  HtmlTagDescriptor,
  Plugin,
  ResolvedConfig,
} from "vite";

type PluginOptions = GeneratorOptions & {
  development?: boolean;
  strictInputMap?: boolean;
  downloadDeps?: boolean;
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
      async resolveId(id, importer, ctx) {
        const options = getOptions(env, _options);
        if (ctx.ssr) {
          // No plans on getting this working in SSR
          return;
        }

        if (importer?.startsWith("http") && id?.startsWith(".")) {
          const newPath = new URL(id, importer).toString();
          if (options?.downloadDeps) {
            return { id: newPath, external: false };
          }
          return { id, external: true };
        }

        if (
          id.startsWith("/") ||
          id.startsWith(".") ||
          id.startsWith("vite/") ||
          id.includes(".css") ||
          id.includes(".html") ||
          path.isAbsolute(id)
        ) {
          return;
        }

        const generator = getGenerator(options);

        // if the module is resolved, ignore it, for cases like when inputMap
        // option of jspm is used
        let resolvedInInputMap = false;
        let proxyImport;

        // if true and inputMap is defined in jspm options, we skip installing deps
        if (options.strictInputMap && options.inputMap) {
          if (options?.downloadDeps) {
            try {
              proxyImport = generator.resolve(id);
              resolvedDeps.add(id);
              return { id: proxyImport, external: false };
            } catch {
              proxyImport = generator.importMap.resolve(id, importer);
              return { id: proxyImport, external: false };
            }
          }

          return {
            id,
            external: true,
          };
        }

        try {
          proxyImport = generator.resolve(id);
          resolvedInInputMap = true;
          resolvedDeps.add(id);
        } catch {
          proxyImport = generator.importMap.resolve(id, importer);
          if (options?.downloadDeps) {
            return { id: proxyImport, external: false };
          }
          return { id, external: true };
        }

        if (options?.development && env.command === "serve") {
          if (!resolvedInInputMap) {
            await generator.install(id);
            proxyImport = generator.resolve(id);
          }
          resolvedDeps.add(id);

          if (options?.downloadDeps) {
            return {
              id: proxyImport,
              external: false,
            };
          }

          return {
            id,
            external: true,
          };
        }
        if (!resolvedInInputMap) {
          await generator.install(id);
          proxyImport = generator.resolve(id);
        }

        if (options?.downloadDeps && process.env?.NODE_ENV === "production") {
          return { id: proxyImport, external: false };
        }

        return { id, external: true };
      },
      async load(id) {
        const options = getOptions(env, _options);

        if (!options?.downloadDeps) {
          return;
        }

        if (id?.startsWith("http")) {
          const code = await (await fetch(id)).text();
          return code;
        }
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
                async: !(options.development && env.command === "serve"),
              },
              injectTo: "head-prepend",
            },
          ];

          if (
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
