---
"vue-rtl-kit": patch
---

Add logical-property mappings for `overscroll-behavior` (`overscrollBehaviorX`/`Y` ↔ `overscrollBehaviorInline`/`Block`) and `contain-intrinsic` sizing (`containIntrinsicWidth`/`Height` ↔ `containIntrinsicInlineSize`/`BlockSize`, opt-in via `{ size: true }`) across `logicalProperty`, `toLogicalStyle`, and `toPhysicalStyle`.
