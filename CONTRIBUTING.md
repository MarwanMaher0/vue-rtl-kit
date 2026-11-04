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
npm run build      # ESM + CJS + types (.d.ts and .d.cts) + styles.css
npm run check:publish  # publint + arethetypeswrong on the packed tarball
```

`check:publish` runs arethetypeswrong twice: strictly for every entry point, then for `./nuxt`
alone with its "require resolves to ESM" rule ignored. Nuxt modules are ESM-only by design (Nuxt
never `require()`s them and `@nuxt/kit` has no CommonJS build); the reasoning lives next to the
command in `scripts/check-publish.mjs`.

CI also builds the playground: `npx vite build -c playground/vite.config.ts`.

## Releases

Releases are versioned with [Changesets](https://github.com/changesets/changesets) and published
only by the Release workflow (`.github/workflows/release.yml`). Nothing is published from a
laptop.

### One-time npm setup

Done once by a maintainer with publish rights on npm:

1. Make sure the `vue-rtl-kit` package name is claimed by the npm account/org that will publish,
   with two-factor auth enabled on that account.
2. Create a token that can publish without an interactive 2FA prompt: an [automation
   token](https://docs.npmjs.com/about-access-tokens) (classic, automation type) or a granular
   access token with publish permission for `vue-rtl-kit`.
3. In GitHub: **Settings → Secrets and variables → Actions**, add a repository secret named
   `NPM_TOKEN` with that token. The workflow reads it as both `NPM_TOKEN` and `NODE_AUTH_TOKEN`.
4. Alternatively, use [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) and skip
   the secret entirely: on npmjs.com open the package → **Settings → Trusted publisher**, add this
   repository with workflow file `.github/workflows/release.yml`. npm then authenticates the
   publish through GitHub's OIDC (`id-token: write` is already granted in the workflow), so you
   can drop `NPM_TOKEN` from the workflow env. Requires npm CLI 11.5.1+, which Node 22 ships.
5. Provenance is switched on with `NPM_CONFIG_PROVENANCE=true` in the workflow, so every publish
   (a `changeset publish` run) carries a signed provenance statement. It only works from a public
   repository and records this repo and workflow as the package's source.

### Release flow

1. **Add a changeset with each user-facing PR.** Run `npx changeset`, answer the prompts
   (patch for a fix, minor for a feature), and commit the generated `.changeset/*.md` file along
   with the change. `npx changeset status` previews what the next release would look like.
2. **Merging to `main` opens the `Version Packages` PR.** The Release workflow runs lint,
   typecheck, unit tests, the build, the Nuxt SSR test and `npm run check:publish`, then
   `changesets/action` opens — or updates, when more changesets land — a pull request titled
   **Version Packages** that bumps `package.json`, folds the changesets into `CHANGELOG.md` and
   deletes the consumed `.changeset/*.md` files. Re-run the same checks on that PR before merging.
   (It is opened with the default `GITHUB_TOKEN`, so GitHub does not start CI on it by itself;
   run the checks locally or push an empty commit to trigger them, or point `GITHUB_TOKEN` at a
   PAT if you want CI on every version PR.)
3. **Merging the `Version Packages` PR publishes.** With no changesets left, the same workflow
   runs the full check suite again and only then runs `npm run release` (`changeset publish`).
   `changeset publish` skips versions npm already has, so ordinary pushes that land with no
   pending changesets stay green instead of failing on a republish, and it creates the git tags
   for the versions it does publish. `NODE_AUTH_TOKEN` (from `NPM_TOKEN`) is what the npmrc
   written by `setup-node` reads at publish time, and `NPM_CONFIG_PROVENANCE=true` attaches the
   provenance statement; the action then turns each new tag into a GitHub release.
4. Every version section in `CHANGELOG.md` is generated from the summaries in the
   `.changeset/*.md` files — write those summaries the way you would write the changelog entry
   itself. The history sections (`0.1.1`, `0.1.0`) stay as they are.

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
