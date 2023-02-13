import path from "path";
import { Generator, GeneratorOptions, fetch } from "@jspm/generator";
import type { ConfigEnv, HtmlTagDescriptor, Plugin } from "vite";

type PluginOptions = GeneratorOptions & {
  downloadDeps?: boolean;
  debug?: boolean
};

const getDefaultOptions = (): PluginOptions => ({
  defaultProvider: "jspm",
  debug: false,
  env: [
    "browser",
    "module",
  ],
});

let generator: Generator

async function plugin(options?: PluginOptions): Promise<Plugin[]> {
  const resolvedDeps: Set<string> = new Set();
  const generatorOptions = { ...getDefaultOptions(), ...options}
  let promises: Promise<void| {
    staticDeps: string[];
    dynamicDeps: string[];
}>[] = []
  
  const log = (msg: string) => {
    if (!generatorOptions?.debug) {
      return
    }
    console.log('[vite-plugin-jspm]:' + msg)
  }
  
  generator = new Generator(generatorOptions);
  if (generatorOptions?.inputMap) {
    await generator.reinstall()
  }

  return [
    {
      name: "jspm:imports-scan",
      enforce: "pre",
      config(_, _env) {
        generatorOptions.env?.push(_env.mode)
      },
      configResolved(config) {
        config.build.modulePreload = false;
        
        // @ts-ignore
        config.plugins.push({
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
        if (ctx.ssr) {
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

        let proxyPath;

        try {
          log(`jspm:imports-scan: Resolving ${id}`)
          proxyPath = generator.resolve(id, importer);
          resolvedDeps.add(id)

          if (options?.downloadDeps) {
            return {
              id: proxyPath,
              external: false
            }
          }

          return { id, external: true }
        } catch {
          promises.push(generator.install(id))
        }
        return
      },
    },
    {
      name: 'jspm:nest-mapping',
      enforce: 'post',
      async resolveId (id, importer) {
        let proxyPath;
        /**
         * If users are trying to load any JS from http url's
         */

        if (promises.length > 0) {
          await Promise.all(promises)
          promises = []
        }

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

        return { id, external: true };
      }
    },
    {
      name: "jspm:post",
      enforce: "post",
      transformIndexHtml: {
        // NODE_ENV is "production" in `vite build`
        enforce: process.env?.NODE_ENV === "production" ? "post" : "pre",
        async transform(html) {
          resolvedDeps.clear();

          const tags: HtmlTagDescriptor[] = [
            {
              tag: "script",
              attrs: {
                type: "module",
                src: "https://ga.jspm.io/npm:es-module-shims@1.5.9/dist/es-module-shims.js",
                async: true,
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
