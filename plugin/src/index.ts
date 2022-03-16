// @ts-ignore
import { Generator } from "@jspm/generator";
import {
  parse,
  transform,
  AttributeNode,
  ElementNode,
} from "@vue/compiler-dom";
import type { PluginOption } from "vite";

function plugin(): PluginOption[] {
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: "jspm", // this is the default defaultProvider
    // Always ensure to define your target environment to get a working map
    // it is advisable to pass the "module" condition as supported by Webpack
    env: ["production", "browser", "module"],
  });
  const installPromiseCache: Promise<unknown>[] = [];
  const localModules: Map<string, { source: string } | undefined> = new Map();

  return [
    {
      name: "jspm:pre",
      enforce: "pre",
      async resolveId(id) {
        console.log("here", id);
        if (
          id.startsWith("/") ||
          id.startsWith(".") ||
          id.startsWith("vite/")
        ) {
          localModules.set(id, undefined);
          return;
        }

        // console.log('here', generator.importMap.resolve(id))
        installPromiseCache.push(await generator.install(id));

        return { id, external: true };
      },
    },
    {
      name: "jspm:post",
      enforce: "post",
      async transformIndexHtml(html) {
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

// copied from vite/src/node/plugins/html.ts
function getScriptInfo(node: ElementNode): {
  src: AttributeNode | undefined;
  isModule: boolean;
  isAsync: boolean;
} {
  let src: AttributeNode | undefined;
  let isModule = false;
  let isAsync = false;
  for (let i = 0; i < node.props.length; i++) {
    const p = node.props[i];
    if (p.type === 6) {
      if (p.name === "src") {
        src = p;
      } else if (p.name === "type" && p.value && p.value.content === "module") {
        isModule = true;
      } else if (p.name === "async") {
        isAsync = true;
      }
    }
  }
  return { src, isModule, isAsync };
}

export default plugin;
