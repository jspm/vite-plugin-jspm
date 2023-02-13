import path from "path";
import { Generator, GeneratorOptions, fetch } from "@jspm/generator";
import type { HtmlTagDescriptor, Plugin } from "vite";

type PluginOptions = GeneratorOptions & {
  downloadDeps?: boolean;
  debug?: boolean;
};

const getDefaultOptions = (): PluginOptions => ({
  defaultProvider: "jspm",
  debug: false,
  env: ["browser", "module"],
});

const getLatestVersionOfShims = async () => {
  const version = await (
    await fetch(`https://ga.jspm.io/npm:es-module-shims`)
  ).text();
  return version;
};

let generator: Generator;

async function plugin(pluginOptions?: PluginOptions): Promise<Plugin[]> {
  const resolvedDeps: Set<string> = new Set();
  const promises: Promise<void | {
    staticDeps: string[];
    dynamicDeps: string[];
  }>[] = [];
  let options = { ...getDefaultOptions(), ...(pluginOptions || {}) };
  options.env = options.env?.filter(
    (envVar) => !["development", "production"].includes(envVar)
  );

  const log = (msg: string) => {
    if (!options?.debug) {
      return;
    }
    console.log("[vite-plugin-jspm]:" + msg);
  };

  generator = new Generator(options);
  if (options?.inputMap) {
    await generator.reinstall();
  }

  return [
    {
      name: "jspm:imports-scan",
      enforce: "pre",
      config(_, _env) {
        options.env?.push(_env.mode);
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

        try {
          log(`jspm:imports-scan: Resolving ${id}`);
          generator.resolve(id, importer);
          resolvedDeps.add(id);
        } catch {
          if (importer?.startsWith("http")) {
            return;
          }

          if (resolvedDeps.has(id)) {
            return;
          }

          log(`jspm:imports-scan: Installing ${id}`);
          promises.push(generator.install(id));
          resolvedDeps.add(id);
        }

        return;
      },
    },
    {
      name: "jspm:import-mapping",
      enforce: "post",
      async resolveId(id, importer, ctx) {
        if (ctx.ssr) {
          return null;
        }

        if (id.startsWith("vite/") || path.isAbsolute(id)) {
          return;
        }

        try {
          await Promise.all(promises);
          promises.length = 0;
        } catch (error) {
          console.log(error);
        }

        if (importer?.startsWith("http") && id?.startsWith(".")) {
          const proxyPath = new URL(id, importer).toString();
          if (options?.downloadDeps) {
            return { id: proxyPath, external: false };
          }
          return { id, external: true };
        }

        // console.log(id, "outside");
        // console.log(generator.importMap.imports);

        try {
          log(`jspm:import-mapping: Resolving ${id}`);
          const proxyPath = generator.resolve(id);
          console.log(id);
          console.log(proxyPath);
          resolvedDeps.add(id);

          if (options?.downloadDeps) {
            return { id: proxyPath, external: false };
          }
          return { id, external: true };
        } catch (e) {
          if (importer?.startsWith("http")) {
            log(`jspm:import-mapping: Resolving ${id} from ${importer}`);
            const proxyPath = generator.importMap.resolve(id, importer);
            resolvedDeps.add(id);
            if (options?.downloadDeps) {
              return { id: proxyPath, external: false };
            }
            return { id, external: true };
          }
        }
      },
      async load(id) {
        if (id?.startsWith("vite/") || !id?.startsWith("http")) {
          return;
        }

        if (options?.downloadDeps) {
          log(`jspm:import-mapping: Downloading ${id}`);
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
        enforce: "post",
        async transform(html) {
          resolvedDeps.clear();
          const esModuleShims = await getLatestVersionOfShims();
          const tags: HtmlTagDescriptor[] = [
            {
              tag: "script",
              attrs: {
                src: `https://ga.jspm.io/npm:es-module-shims@${esModuleShims}/dist/es-module-shims.js`,
                async: true,
              },
              injectTo: "head-prepend",
            },
          ];

          if (!options?.downloadDeps) {
            tags.push({
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
export { generator };
