# vite-plugin-jspm

> Import maps: a way to control the behavior of JavaScript imports. [WICG/import-maps](https://github.com/WICG/import-maps)

> CDN: A content delivery network (CDN) refers to a geographically distributed group of servers which work together to provide fast delivery of Internet content. [Cloudflare.com](https://www.cloudflare.com/en-ca/learning/cdn/what-is-a-cdn/)

A vite plugin which externalizes dependencies and resolves them independently from **CDN (Content Delivery Network) providers** using [import maps](https://github.com/WICG/import-maps) and [es-module-shims](https://github.com/guybedford/es-module-shims)!
This plugin generates an import map for your app automatically in both development and production, and resolves dependencies based on that.

It is based on [@jspm/generator](https://github.com/jspm/generator) which supports different providers like _jspm_, _unpkg_ and _skypack_.

## Usage

```ts
import { defineConfig } from "vite";
import jspmPlugin from "vite-plugin-jspm";

export default defineConfig({
  plugins: [jspmPlugin()],
});
```

## Custom options

### `inputMap`

`inputMap` is a `@jspm/generator` option. When passed, the plugin takes it as source of truth. And resolves the imports against it.

### `downloadDeps`

When passed, downloads the dependencies and bundles them with the build. But in dev mode `vite dev`, the plugin serves the dependencies from the CDN.

### env

`env` is a `@jspm/generator` option. Users don't need to pass `production` or `development` option. The env is applied according to the vite env.

### debug

`debug` let's you skim through the logs during resolution and downloading pahses.

# Bundle size

You can see the bundle size of [`test/basic`](https://github.com/jspm/vite-plugin-jspm/tree/main/test/basic) example in two cases:

```
# with this plugin
vite v4.1.1 building for production...
✓ 16 modules transformed.
build/index.html                  4.80 kB
build/assets/index-8f42e5ff.css   9.58 kB │ gzip: 1.64 kB
build/assets/index-37524fa0.js   14.11 kB │ gzip: 3.71 kB

# with downloadDeps flag in the plugin
vite v4.1.1 building for production...
✓ 45 modules transformed.
build/index.html                   2.42 kB
build/assets/index-8f42e5ff.css    9.58 kB │ gzip:  1.64 kB
build/assets/index-38fd63e9.js   187.02 kB │ gzip: 59.80 kB
```

# Contribution

Feel free to open issues and PRs!
