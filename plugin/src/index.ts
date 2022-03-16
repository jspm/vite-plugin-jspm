import type { Plugin, PluginOption } from "vite";

function plugin(): PluginOption {
  return {
    name: "jspm",
    enforce: "pre",
    resolveId(id) {
      console.log(id)
      return null;
    },
  };
}

export default plugin;
