# Vue 3 + Vite starter

[Open in StackBlitz](https://stackblitz.com/github/MarwanMaher0/vue-rtl-kit/tree/main/examples/vite)

A small Arabic/English app using the public `vue-rtl-kit` exports. The dependency is
`"vue-rtl-kit": "file:../.."`, so nothing needs to be published to npm. Keep the
example inside a full checkout of this repository, including when using StackBlitz.

## Run

Use Node 20.19+ (Node 22 recommended) and npm. From the repository root:

```sh
npm ci
npm ci --prefix examples/vite
npm run dev --prefix examples/vite
```

The root `npm ci` runs `prepare`, which builds the library's `dist/` exports before
the example installs the local package. If you change the library, run
`npm run build` at the repository root again.

For a production build, from `examples/vite`:

```sh
npm run build
npm run preview
```

`build` type-checks the app and writes the static site to `dist/`. `npm run
typecheck` runs just the app's type check. `vite.config.ts` deduplicates Vue so the
linked library and the app share one Vue runtime. The `vue` path in `tsconfig.json`
also directs the linked library's declarations to the app's Vue types, preventing
duplicate ref/plugin types when the repository locks a different Vue patch version.

## Try it

- Switch between **العربية** and **English**. `setLocale()` updates the document's
  `lang` and `dir`; Arabic starts in RTL and English switches to LTR.
- `BidiText` isolates Latin product names, dates, and order numbers inside mixed
  Arabic/English text.
- `useLogicalStyles().toLogical()` turns a physical border/padding into logical
  start-side properties. `mirror()` changes the arrow's offset reactively.
- `useFormat()` follows the selected locale. `numberingSystem: { ar: 'arab', en:
  'latn' }` explicitly requests Arabic-Indic digits (`١٢٣٤`) in Arabic and Western
  digits (`1234`) in English. The date uses a fixed timestamp and UTC.

This is a client-rendered Vue app. For server-rendered `<html dir>` and `<html
lang>` before hydration, see the [Nuxt starter](../nuxt/README.md).
