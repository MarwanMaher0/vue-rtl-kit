---
"vue-rtl-kit": patch
---

Mark component factories, injection keys, and formatter caches as side-effect free so a bundler can drop them. Importing `isolateRuns`, `toLogicalStyle`, or `directionOfLocale` no longer pulls in Vue, and importing `formatNumber` no longer pulls in component or directive code. Runtime behaviour and exports are unchanged.
