# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo overview

Salty CSS is a build-time CSS-in-JS library. This is an Nx monorepo containing the core compiler, the per-framework integrations published to npm, and two example apps used as fixtures during development.

- `libs/core` (`@salty-css/core`) — the compiler, factories, parsers, generators, CLI, and shared types. Everything else depends on this.
- `libs/react`, `libs/next`, `libs/astro`, `libs/vite`, `libs/webpack` — framework integrations / bundler plugins. Each one is a separate npm package and a separate Nx project.
- `libs/eslint-config-core`, `libs/eslint-plugin-core` — ESLint config and plugin published with the library.
- `libs/cli` (`salty-css` on npm) and `libs/npm-create` — tiny wrappers that re-export `@salty-css/core/bin/main` so users can run `npx salty-css …` / `npm create salty-css`.
- `apps/react-testing`, `apps/astro-testing` — real apps used as fixtures to exercise the compiler end-to-end. `.saltyrc.json` points at these and `react-testing` is the `defaultProject`.

Source-of-truth docs live in the root `README.md`; `scripts/update-readmes.mjs` copies it into each published lib at release time. **Edit the root README, not the per-lib copies.**

When thinking of running tests, ALWAYS only run a currently supported "npm run" command from the repo root. Don't run `vitest`, `tsc`, or `nx` directly.

## Common commands

All commands run from the repo root. The repo uses Nx; equivalent `nx run …` forms work too.

- `npm run dev:react` — Vite dev server for the React fixture app (most useful for trying things out).
- `npm run dev:astro` — Astro dev server for the Astro fixture app.
- `npm run test:core` — vitest for `@salty-css/core` (the bulk of the logic).
- `npm run test:all` — vitest across core, vite, react, webpack, next.
- `npm run build:all` — runs `update-readmes` then builds every published package. Required before publishing.
- `npm run build:core` (and `build:react`, `build:vite`, …) — build a single package.
- `npm run pretty` — Prettier across the repo.
- `npx nx run core:lint` — lint a single project (the workspace doesn't define a root `lint` script).
- `npx nx run core:typecheck` — typecheck a single project.

Run a single test file: `npx nx run core:test -- src/parsers/parser.spec.ts` (or `npx vitest run libs/core/src/parsers/parser.spec.ts` from the repo root). Vitest is wired via the `@nx/vitest` plugin in `nx.json`; tests are colocated next to source as `*.spec.ts(x)`.

Publishing is automated via `npm run publish:all` / `publish:all-dev` (runs tests, builds, bumps versions with `lerna version --force-publish`, then publishes each package's `dist/` folder, prompting once for an npm OTP). Don't invoke these ever.

## Architecture

### The build pipeline (libs/core/src/compiler/salty-compiler.ts)

`SaltyCompiler` is the heart of the project. Bundler plugins instantiate one per project root and drive it. The flow:

1. **Locate the project.** `.saltyrc.json` (looked up by walking parent dirs) declares projects, their framework, and where `salty.config.ts` lives. `defaultProject` is the fallback.
2. **Collect "salty files."** Any file matching `*.(salty|css|styles|styled).(ts|tsx|...)` — see `saltyFileExtensions` in `libs/core/src/compiler/helpers.ts`. Files containing `defineX(` calls are also recorded as _config files_.
3. **Compile each salty file with esbuild** into `saltygen/js/<hash>-<contentHash>.js`, then dynamic-`import()` the result to read its exports. The compiler injects `globalThis.saltyConfig` (from `saltygen/cache/config-cache.json`) before the file runs, and rewrites `styled(X, …)` calls where `X` is imported from a non-salty file (so the import can be tree-shaken).
4. **Bucket exports by marker flags** set on the factory objects: `isMedia`, `isGlobalDefine`, `isDefineVariables`, `isDefineTemplates`, `isDefineFont`, `isClassName`, `isKeyframes`, or a `generator` for styled components.
5. **Emit CSS** into `<project>/saltygen/`:
   - `css/_variables.css`, `_reset.css`, `_global.css`, `_templates.css`, `_fonts.css` — global layers (always written, possibly empty).
   - `css/<component>-<hash>-<priority>.css` — per-component files.
   - `css/l_<priority>.css` — per-layer bundles when `importStrategy !== 'component'`.
   - `css/f_<file>-<hash>.css` — per-source-file bundles when `importStrategy === 'component'`.
   - `index.css` — top-level entry that declares `@layer reset, global, templates, fonts, l0…l8;` and imports the above. **This is what users `@import` from their app.**
   - `types/css-tokens.d.ts` — generated `VariableTokens` / `TemplateTokens` / `MediaQueryKeys` types consumed by user code via TS module augmentation.
   - `cache/config-cache.json` — merged config snapshot, also mirrored into the installed `@salty-css/core` package so other entrypoints can read it without re-running the compiler.

`generateCss()` is the full rebuild (used on `buildStart`); `generateFile(path)` is the incremental path used by HMR — it patches per-file CSS and re-injects into the right `l_<priority>.css` bundle without clearing `saltygen/`.

### Bundler plugins

Each integration in `libs/{vite,next,webpack,astro}/src` is a thin shell around `SaltyCompiler` that calls `generateCss()` on build start and `generateFile()` on file change. Framework-specific source transforms (the code that turns a `.css.ts` import into runtime React/etc.) live with the framework — e.g. `libs/react/src/transform-salty-file.ts` — and are loaded dynamically based on the framework field in `.saltyrc.json` (see `loadFrameworkTransform` in `libs/vite/src/index.ts`). When adding a new framework, both pieces are needed.

### Authoring API (libs/core/src/factories)

These are the user-facing factories that produce the marker-flagged objects the compiler buckets:

- `defineConfig` (in `libs/core/src/config`) — the project config (`variables`, `global`, `templates`, `mediaQueries`, `modifiers`, `reset`, `importStrategy`, `externalModules`).
- `defineGlobalStyles`, `defineVariables`, `defineMediaQuery`, `defineTemplates`, `defineFont` — each returns an object with the right `isX` flag and a `_toCss()` / `_current` shape the compiler knows how to consume.
- `styled` (React only) and `className` (framework-agnostic) live in `libs/react/src` and build a `StylesGenerator` (see `libs/core/src/generators`). The generator's `_withBuildContext({ callerName, isProduction, config })` is what the compiler invokes to produce the final CSS for a component.
- `keyframes` lives in `libs/core/src/css/keyframes.ts`.

The full user-facing API surface (with examples for every factory) is documented in the root `README.md` — read it before changing factory signatures.

### Parsers (libs/core/src/parsers)

`parseStyles` / `parseAndJoinStyles` is the CSS-in-JS object → CSS-string conversion, including variable token resolution (`{colors.brand.main}` → `var(--colors-brand-main)`), template expansion (e.g. `textStyle: 'headline.large'`), media-query scoping, and modifier matching (regex-based dynamic value rewrites declared in `defineConfig({ modifiers })`). When a styling bug doesn't reproduce in unit tests, it usually means the bug is in the _generator_ layer that calls into the parser, not the parser itself.

## Conventions

- **File extensions matter.** User code must put `styled`, `className`, `keyframes`, and `defineX` calls in files ending `.css.ts`, `.salty.ts`, `.styles.ts`, or `.styled.ts` — the compiler ignores everything else. Don't move these calls into a regular `.ts` file "to share."
- **Single quotes, 2-space indent, 160-char lines** (`.prettierrc` + `.editorconfig`). Run `npm run pretty` before committing changes that touch many files.
- **No `cd lib && build`.** Always go through the root `npm run build:<lib>` scripts so Nx caching works.
- Tests live next to source as `*.spec.ts`. Look at `libs/core/src/parsers/parser.spec.ts` and `libs/core/src/generators/styles-generator.spec.ts` for the patterns used to assert generated CSS.
