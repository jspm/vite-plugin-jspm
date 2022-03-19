# vite-plugin-jspm

A vite plugin which externalize dependencies and resolves them independently from **CDN providers** using [import maps](https://github.com/WICG/import-maps) and [es-module-shims](https://github.com/guybedford/es-module-shims)!

```ts
import { defineConfig } from "vite";
import jspmPlugin from "vite-plugin-jspm";

export default defineConfig({
  plugins: [
    jspmPlugin({
      // optional object for plugin options, more info in https://github.com/jspm/generator
    }),
  ],
  // we need to disable vite's default polyfilling, because es-module-shims enables it instead
  build: { polyfillModulePreload: false, polyfillDynamicImport: false },
});
```

#### Bundle size

You can see the bundle size of [`test/basic`](https://github.com/jspm/vite-plugin-jspm/tree/main/test/basic) example in two cases:
```
# without this plugin
dist/index.html                  0.45 KiB
dist/assets/index.75d36a39.js    0.23 KiB / gzip: 0.17 KiB
dist/assets/vendor.75a6031c.js   128.58 KiB / gzip: 41.37 KiB

# with this plugin
dist/index.html                 0.86 KiB
dist/assets/index.0fb49565.js   0.23 KiB / gzip: 0.15 KiB
```

## development 

For now, development is not supported and fails because es-module-shims cannot control modules like `vite/client`.
