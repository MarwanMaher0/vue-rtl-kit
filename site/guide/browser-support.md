# Browser support

Everything here is native platform behaviour, with no polyfills. Layout uses CSS logical properties, direction utilities use `:dir()` and the independent `scale` property, and isolates use `<bdi>` or Unicode control characters.

## Support table

| Feature | Chrome | Firefox | Safari |
| --- | --- | --- | --- |
| `<bdi>` and Unicode isolates | 16 | 10 | 6.1 |
| CSS logical properties (margin/padding/inset/border) | 87 | 66 | 14.1 |
| Flow-relative corner radii (`border-start-start-radius`) | 89 | 66 | 15 |
| `:dir()` (own-direction utilities) | 120 | 49 | 16.4 |
| Independent `scale` property | 104 | 72 | 14.1 |
| Inline scroll (negative RTL `scrollLeft`, `ResizeObserver`) | 85 | 69 | 15.4 |
| `Intl` numbering systems (`-u-nu-`) | 24 | 29 | 10 |

The inline scroll helpers (`getScrollInline`, `scrollToInline`, `scrollByInline`, `scrollInlineEdges`, and `useInlineScroll`) assume the CSSOM View negative-`scrollLeft` RTL model (Chrome 85+, Firefox, Safari 15.4+) and horizontal writing modes (`writing-mode: horizontal-tb`) only. `useInlineScroll` uses `ResizeObserver` when available (Chrome 64+, Firefox 69+, Safari 13.1+) and degrades safely when it is absent.

## `:dir()` and `scale`

The own-direction utilities (`.rtl-only`, `.ltr-only`, `.rtl-flip`, `.rtl-noflip`, `.rtl-scroll-x`) follow the element's own direction, not any ancestor `dir` attribute. Transform-preserving mirroring and those utilities need both `:dir()` and `scale`: Chrome 120+, Firefox 72+, or Safari 16.4+.

Older browsers use ancestor `[dir]` selectors and a transform fallback behind `@supports not selector(:dir(rtl))`:

```css
@supports not selector(:dir(rtl)) {
  [dir='rtl'] .rtl-flip {
    transform: scaleX(-1);
  }
}
```

## Fallback limits

The fallback keeps explicit-direction display and mirroring working, but it has three limits:

- Nested direction islands can match a distant ancestor `[dir]` instead of the nearest scope.
- Mirroring uses `transform: scaleX(-1)`, which overwrites a `transform` the element already carries.
- The fallback needs an explicit `dir`. With `:dir()`, `.rtl-only` also hides on pages without a `dir` attribute because HTML defaults to LTR.

## toPhysicalStyle for canvas, SVG, PDF and email

Where logical properties never reach, resolve them in JavaScript with `toPhysicalStyle(style, dir)`. It expands the 1- and 2-value logical shorthands to physical sides for the given direction.

```ts
import { toPhysicalStyle } from 'vue-rtl-kit'

toPhysicalStyle({ marginInlineStart: '8px' }, 'rtl')
// { marginRight: '8px' }

toPhysicalStyle({ insetInlineStart: '12px', textAlign: 'start' }, 'rtl')
// { right: '12px', textAlign: 'right' }

toPhysicalStyle({ marginInline: '1px 2px' }, 'rtl')
// { marginRight: '1px', marginLeft: '2px' }
```

Use the result when writing canvas drawing calls, inline SVG attributes, PDF templates, or email HTML that cannot consume logical CSS.
