# Contributing to vue-rtl-kit

Bug reports (especially strings that still render in the wrong order), fixes and small,
focused pull requests are all welcome.

## Set up

Node 20 or 22, which is what CI runs.

```bash
git clone https://github.com/MarwanMaher0/vue-rtl-kit.git
cd vue-rtl-kit
npm ci
npm run play       # playground at http://localhost:5178
```

## Run the checks

```bash
npm run lint       # ESLint, zero warnings allowed
npm run typecheck  # vue-tsc --noEmit
npm test           # Vitest, test/
npm run build      # ESM + CJS + types + styles.css
```

CI also builds the playground: `npx vite build -c playground/vite.config.ts`.

## Where things live

- `src/bidi.ts` splits text into directional runs and isolates the ones that would move.
- `src/logical.ts` maps physical CSS properties to logical ones and back.
- `src/format.ts` and `src/locale.ts` wrap `Intl`, numbering systems and locale direction.
- `src/components/`, `src/composables/` and `src/directives/` are the Vue surface.
- `src/nuxt/` is the Nuxt module and its runtime plugin; `src/styles/logical.css` is the CSS.
- `test/ssr.spec.ts` runs with no `window` and no `document`.

## Style

- Match the existing code: two spaces, no semicolons, single quotes, `import type` for types.
- No runtime dependencies.
- Nothing touches `document` or `window` at import time or during render. A new component also
  gets a case in `test/ssr.spec.ts`.
- The CSS utilities use logical properties only, with no `[dir="rtl"]` override blocks.
- A bidi fix comes with the exact string that broke, as a test case.
- Commit messages use the prefixes already in the history: `feat:`, `fix:`, `docs:`, `ci:`.

## Propose a change

1. For anything bigger than a small fix, open an issue first so the approach is agreed before
   you write code. The roadmap lives in the open issues.
2. Branch from `main`, keep the pull request to one change, and fill in the template.
3. CI must be green before review.

Security problems go through [SECURITY.md](SECURITY.md), not a public issue.
