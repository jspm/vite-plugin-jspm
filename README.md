# vite-plugin-jspm

> Import maps: a way to control the behavior of JavaScript imports. [WICG/import-maps](https://github.com/WICG/import-maps)

> CDN: A content delivery network (CDN) refers to a geographically distributed group of servers which work together to provide fast delivery of Internet content. [Cloudflare.com](https://www.cloudflare.com/en-ca/learning/cdn/what-is-a-cdn/)

A vite plugin which externalizes dependencies and resolves them independently from **CDN (Content Delivery Network) providers** using [import maps](https://github.com/WICG/import-maps) and [es-module-shims](https://github.com/guybedford/es-module-shims)! 
This plugin generates an import map for your app automatically in both development and production, and resolves dependencies based on that.

It is based on [@jspm/generator](https://github.com/jspm/generator) which supports different providers like *jspm*, *unpkg* and *skypack*.

## Usage

```ts
import { defineConfig } from "vite";
import jspmPlugin from "vite-plugin-jspm";

export default defineConfig({
  plugins: [
    jspmPlugin({
      development: true // enables the plugin in `vite dev`
      // optional object for @jspm/generator options and settings, more info in https://github.com/jspm/generator
    }),
  ],
});
```

## Custom options

### `inputMap`
`inputMap` is a `@jspm/generator` option. When passed, the plugin takes it  as source of truth. And resolves the imports against it.

### `downloadDeps`
When passed, downloads the dependencies and bundles them with the build. But in dev mode `vite dev`, the plugin serves the dependencies from the CDN.

# Bundle size

You can see the bundle size of [`test/basic`](https://github.com/jspm/vite-plugin-jspm/tree/main/test/basic) example in two cases:
```
# without this plugin
dist/index.html                  0.45 KiB
dist/assets/index.75d36a39.js    0.23 KiB / gzip: 0.17 KiB
dist/assets/vendor.75a6031c.js   128.58 KiB / gzip: 41.37 KiB

# with this plugin
dist/index.html                 0.91 KiB
dist/assets/index.b911b8a6.js   0.23 KiB / gzip: 0.16 KiB

# with downloadDeps flag in the plugin
dist/index.html                 0.50 KiB
dist/assets/index.1f44e570.js   140.50 KiB / gzip: 44.96 KiB
```

# Contribution
Feel free to open issues and PRs!
