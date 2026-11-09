---
"vue-rtl-kit": minor
---

Handle CSS shorthands in the logical style helpers:

- `toPhysicalStyle` now expands 1- and 2-value logical shorthands (`marginInline`, `paddingInline`, `insetInline`, `insetBlock`, `borderInlineWidth`/`Style`/`Color`, `scrollMarginInline`, `scrollPaddingInline`, plus their block-axis and scroll counterparts) to the physical sides for the given direction instead of returning them unchanged.
- `toLogicalStyle` accepts opt-in `{ shorthands: true }` to expand 1–4-value (or numeric) physical `margin`, `padding`, `inset`, `borderWidth`, `borderStyle`, `borderColor`, and `borderRadius` into logical longhands. Values containing `var()`, `calc()`, `!important`, or a top-level `border-radius` slash are left untouched; other functions such as `rgb()`, `hsl()`, and `env()` are preserved and split only at top-level whitespace.
- Default output is unchanged when the new option is off, and exports are unchanged.
