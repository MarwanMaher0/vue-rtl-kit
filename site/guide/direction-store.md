# Direction store

The direction store is the shared reactive state behind the Vue plugin, every composable, and each `<RtlProvider>` scope.

## State and actions

`createRtl()` returns an `RtlInstance`, which extends `DirectionContext`:

| Member | Type | Meaning |
| --- | --- | --- |
| `dir` | `Ref<Direction>` | Current `'rtl'` or `'ltr'` value. |
| `locale` | `Ref<string>` | Current BCP-47 locale tag. |
| `isRtl`, `isLtr` | `ComputedRef<boolean>` | Direction predicates. |
| `startSide`, `endSide` | `ComputedRef<'left' \| 'right'>` | Physical sides for inline start and end. |
| `sign` | `ComputedRef<1 \| -1>` | `1` in LTR and `-1` in RTL. |
| `setDirection(dir)` | `(dir: Direction) => void` | Set and pin direction. |
| `toggleDirection()` | `() => Direction` | Flip and pin direction, returning the new value. |
| `setLocale(locale)` | `(locale: string) => void` | Change locale and, unless pinned, resolve its direction. |
| `htmlAttrs()` | `() => { dir: Direction, lang: string }` | Attributes for an SSR document shell. |

`RtlInstance` also has `isRoot: true`, resolved `options`, an `install(app)` method, and `dispose()` for stopping document synchronization.

## Locale changes versus direction changes

Direction initially follows the locale. Calling `setDirection()` or `toggleDirection()` pins it, so a later `setLocale()` changes only the language.

```ts
import { createRtl } from 'vue-rtl-kit'

const rtl = createRtl({
  locales: ['en', 'ar', 'he'],
  defaultLocale: 'en',
})

rtl.setLocale('ar')
console.log(rtl.dir.value) // 'rtl'

rtl.setDirection('ltr')
rtl.setLocale('he')
console.log(rtl.dir.value) // 'ltr': direction was pinned
```

The returned store is usable outside a component tree, such as in application setup or a router guard. Install the same object with `app.use(rtl)` so components share it.

## Document and SSR behavior

With `syncDocument: true`, the browser store keeps `document.documentElement.dir` and `lang` synchronized. `htmlClass` can additionally maintain direction classes.

SSR never touches the DOM. For a manual Vue SSR shell, use the actual store values:

```ts
const attrs = rtl.htmlAttrs()
// { dir: 'rtl', lang: 'ar' }
```

The Nuxt module performs this document-shell integration automatically.

## Standalone state

Use `createDirectionState()` when you need the same state machine without installing a plugin:

```ts
import { createDirectionState } from 'vue-rtl-kit'

const state = createDirectionState({
  dir: 'rtl',
  locale: 'ar',
  locales: { en: 'ltr', ar: 'rtl' },
})

state.setLocale('en')
```

This lower-level helper does not synchronize the document and has no `isRoot`, `options`, `install`, or `dispose` members.
