---
"vue-rtl-kit": patch
---

Resolve paired brackets (`()`, `[]`, `{}`) in `splitBidiRuns` and `isolateRuns` using Unicode Bidirectional Algorithm paired-bracket logic (N0) so matched brackets enclosing opposite-direction content stay together inside the isolate, mixed-direction bracket pairs stay outside in the base direction, and unmatched brackets remain neutral.
