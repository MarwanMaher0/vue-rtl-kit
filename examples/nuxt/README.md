# Nuxt 3 · vue-rtl-kit

[Open in StackBlitz](https://stackblitz.com/github/MarwanMaher0/vue-rtl-kit/tree/main/examples/nuxt)

A standalone, server-rendered Arabic/English starter. The restrained cream, ink and terracotta page demonstrates bidirectional text, logical styles and locale-bound formatting without extra UI dependencies.

## Run locally

Use Node **20.19.0 or newer**. From the repository root:

```sh
npm ci
npm ci --prefix examples/nuxt
npm run dev --prefix examples/nuxt
```

The root `npm ci` runs `prepare`, which builds the local library's `dist` exports. This example consumes that checkout through `"vue-rtl-kit": "file:../.."`; no published package is needed. Keep the repository layout intact. For StackBlitz, open a terminal at the repository root and run the same setup commands if dependencies have not already been installed.

## Build and preview

From this directory (`examples/nuxt`):

```sh
npm run build
npm run preview
```

Open the URL printed by Nuxt. The build produces a Nitro Node server in `.output`; preview serves that production build. You can also run these scripts from the repository root with `--prefix examples/nuxt`.

## Check server rendering

Open **View Page Source**, not only the browser's Elements panel. The opening HTML element must include `dir="rtl"` and `lang="ar"` (attribute order may vary), for example:

```html
<html dir="rtl" lang="ar">
```

Arabic content, isolated `<bdi>` runs and Arabic-Indic formatted figures should already be in the response, before JavaScript runs. The `vue-rtl-kit/nuxt` module installs the universal plugin, stylesheet, components and composables and sets these HTML attributes on the server. There is no client-only plugin or `ClientOnly` wrapper.

Select **English**: text, logical spacing, the arrow, numbers and the document's `dir`/`lang` change together. Select **العربية** to switch back. This starter does not persist the selection: a full reload intentionally resets to Arabic, the configured `defaultLocale`.

## APIs in the example

- `useDirection()` exposes reactive `locale` and `dir`. The language buttons call `setLocale('ar')` / `setLocale('en')`. Do not set `rtl.dir` in the config: an explicit direction pins it instead of deriving it from the locale.
- `BidiText` isolates opposite-direction runs in mixed Arabic/Latin text, including the order identifier and punctuated date. Its default element strategy uses `<bdi>` without inserting invisible characters into copied text.
- `useLogicalStyles().toLogical()` converts the sample's JavaScript `paddingLeft` and `borderLeft` into flow-relative properties. The browser resolves them in either direction. `mirror()` is read inside a computed arrow transform so its horizontal offset and orientation update when the locale changes. The remaining CSS uses logical properties directly.
- `useFormat()` returns a computed group of locale-bound `formatNumber`, `formatCurrency` and `formatDate` helpers. In script, read `fmt.value`; Vue unwraps it in templates. `arab` means Arabic-Indic digits (`٠١٢٣٤٥٦٧٨٩`), while `latn` means Western digits (`0123456789`). The config chooses `arab` for Arabic and `latn` for English; a per-call `numberingSystem: 'latn'` demonstrates an override without changing the locale.
- The formatted date uses the fixed instant `2024-05-12T12:00:00.000Z`, the Gregorian calendar and `timeZone: 'UTC'`, avoiding server/browser time-zone differences during hydration.

Explicit imports from `vue` and the public `vue-rtl-kit` export keep editor typing straightforward. The Nuxt module also makes the kit's components and composables available through auto-imports.
