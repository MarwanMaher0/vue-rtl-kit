# SSR without Nuxt

The library is SSR-safe by design. Importing it, creating the direction store, and rendering its components never read `window` or `document`, so a plain Vue 3 server can produce the document shell itself.

## Manual Vue SSR shell

Call `createRtl()` on the server, install the store on the app, and interpolate `htmlAttrs()` into the opening `<html>` tag. `renderToString()` produces the body.

```ts
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRtl } from 'vue-rtl-kit'

export async function renderShell() {
  const rtl = createRtl({ locales: ['en', 'ar'], defaultLocale: 'ar' })
  const app = createSSRApp({
    render: () => h('main', { dir: rtl.dir.value }, 'مرحبا بالعالم'),
  })
  app.use(rtl)

  const attrs = rtl.htmlAttrs()
  const body = await renderToString(app)
  return `<!DOCTYPE html>
<html dir="${attrs.dir}" lang="${attrs.lang}">
  <body>${body}</body>
</html>`
}
```

`htmlAttrs()` returns `{ dir, lang }`, so the first response is already in the visitor's direction:

```html
<html dir="rtl" lang="ar">
  <body><main dir="rtl">مرحبا بالعالم</main></body>
</html>
```

Keep the same attrs on the client shell before hydration. The components and directive are registered by `app.use(rtl)`.

## What never touches the DOM

- Importing `vue-rtl-kit` does not read `window` or `document`.
- `createRtl()` is safe to call on the server. The document-sync watcher is skipped when there is no document, even with `syncDocument: true`.
- `isServer` is `true` and `isClient` is `false` during server rendering.
- `<BidiText>` and `<RtlProvider>` write their isolates and direction attributes into the server HTML.
- `v-rtl` implements `getSSRProps`, so its attributes are in the server HTML too.
- [`v-digits`](/guide/v-digits) acts on edits, not on initial values. It leaves a field's value unchanged on the server and when the field mounts in the browser.

## v-rtl getSSRProps

The directive resolves its binding during server rendering and emits the same `dir` attribute, plus `unicode-bidi: isolate` when requested:

```vue
<template>
  <pre v-rtl:ltr>npm install vue-rtl-kit</pre>
  <span v-rtl:ltr.isolate>feature/rtl-kit</span>
</template>
```

```html
<pre dir="ltr">npm install vue-rtl-kit</pre>
<span dir="ltr" style="unicode-bidi:isolate;">feature/rtl-kit</span>
```

## Isolates in server HTML

`<BidiText>` splits the text during render, so the isolate is part of the string the server sends rather than something applied after hydration:

```vue
<BidiText as="p" dir="rtl" text="الإصدار v1.2.3 متاح الآن" />
```

```html
<p dir="rtl">الإصدار <bdi dir="ltr">v1.2.3</bdi> متاح الآن</p>
```

## When to use the Nuxt module instead

Use the [Nuxt module](/guide/nuxt-module) when the application is already Nuxt. It installs the runtime plugin, feeds reactive `dir` and `lang` to Nuxt's head integration during SSR, auto-imports the composables, registers the components, and can inject the stylesheet and persist the locale in a cookie.

Use the manual shell here for a Vite SSR app, an Express, Fastify or Hono server, or a custom renderer where you own the document template. Do not call `htmlAttrs()` a second time when the Nuxt module already owns the head.
