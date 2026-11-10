# CSS utilities

The optional CSS utilities provide logical spacing, alignment, borders, positioning, text isolation, and directional icon helpers for RTL and LTR layouts. They follow the nearest `dir` attribute without a stylesheet swap. Import the stylesheet once:

```ts
import 'vue-rtl-kit/styles.css'
```

The Nuxt module does this by default. Every layout rule uses logical properties, so the nearest `dir` attribute determines the result and runtime direction changes require no stylesheet swap.

## Design tokens

```css
:root {
  --rtl-space: 0.25rem;
  --rtl-border-width: 1px;
  --rtl-radius: 0.375rem;
}
```

Override the tokens to match your design system. Spacing utilities multiply `--rtl-space`.

## Spacing

| Classes | CSS |
| --- | --- |
| `ms-0` through `ms-6`, `ms-8`, `ms-10`, `ms-12`, `ms-auto` | `margin-inline-start` |
| `me-0` through `me-6`, `me-8`, `me-10`, `me-12`, `me-auto` | `margin-inline-end` |
| `mi-0` through `mi-4`, `mi-auto` | `margin-inline` |
| `ps-0` through `ps-6`, `ps-8`, `ps-10`, `ps-12` | `padding-inline-start` |
| `pe-0` through `pe-6`, `pe-8`, `pe-10`, `pe-12` | `padding-inline-end` |
| `pi-0` through `pi-4`, `pi-6` | `padding-inline` |

The numeric margin scale includes `0`, `1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, and `12`. The numeric padding scale is the same except `pi-*` and `mi-*`, which stop at the values listed above.

```html
<button class="ms-4 ps-3 pe-3">Save</button>
```

## Alignment and flex

| Classes | CSS |
| --- | --- |
| `text-start`, `text-end`, `text-center` | Logical or centered text alignment |
| `float-start`, `float-end` | `float: inline-start / inline-end` |
| `clear-start`, `clear-end` | `clear: inline-start / inline-end` |
| `justify-start`, `justify-end` | `justify-content: flex-start / flex-end` |
| `items-start`, `items-end` | `align-items: flex-start / flex-end` |

## Position and borders

| Classes | CSS |
| --- | --- |
| `start-0`, `start-auto` | `inset-inline-start` |
| `end-0`, `end-auto` | `inset-inline-end` |
| `inset-i-0` | `inset-inline: 0` |
| `border-s`, `border-e` | Logical inline border using `--rtl-border-width` |
| `border-s-0`, `border-e-0` | Zero logical inline border width |
| `rounded-s`, `rounded-e` | Logical corner radii using `--rtl-radius` |
| `rounded-s-0`, `rounded-e-0` | Zero logical corner radii |

Position utilities require the positioned element and any required offsets or dimensions from your own CSS.

## Bidirectional text

| Class | Effect |
| --- | --- |
| `bidi-isolate` | `unicode-bidi: isolate` |
| `bidi-plaintext` | `unicode-bidi: plaintext` |
| `bidi-nowrap` | Isolation plus `white-space: nowrap` |
| `nums-latn` | Lining numerals and Unicode isolation |

Use `bidi-plaintext` for code and paths whose own direction is authoritative. For mixed sentences that need run-level isolation, prefer `BidiText`.

## Directional display and icons

| Class | Effect |
| --- | --- |
| `ltr-only` | Hidden when the element's own direction is RTL (`:dir(rtl)`) |
| `rtl-only` | Hidden when the element's own direction is LTR (`:dir(ltr)`) |
| `rtl-flip` | Mirrors the element with `scale: -1 1` when its own direction is RTL |
| `rtl-noflip` | Cancels an ancestor `rtl-flip` for a nested element |
| `rtl-scroll-x` | Sets `direction: rtl` when the element's own direction is RTL |

These utilities key off the element's own direction with `:dir(rtl)` / `:dir(ltr)`, not any ancestor `dir` attribute. Inside a `dir="ltr"` island on an RTL page — an `<RtlProvider dir="ltr">` scope or a `v-rtl:ltr` subtree, say — `.ltr-only` shows, `.rtl-only` hides, and `.rtl-flip` does not mirror; an RTL island inside that behaves as RTL again. `.rtl-flip` uses the independent `scale` property, so it composes with a `transform` the element already carries instead of overwriting it.

This behavior requires Chrome 120+, Firefox 72+, or Safari 16.4+ (`:dir()` and `scale`). Browsers without `:dir()` use the previous ancestor selectors and `transform: scaleX(-1)` inside `@supports not selector(:dir(rtl))`; this fallback needs an explicit `dir`, can match distant ancestors across direction islands, and overwrites an existing `transform`. With `:dir()`, `.rtl-only` also hides on pages without `dir`, since HTML defaults to LTR.

Only mirror directional glyphs such as arrows and chevrons. Do not mirror logos, clocks, checkmarks, or media controls.
