# Trace Trail

Follows a trace through a directory tree, step by step. Built with [Vite+](https://viteplus.dev), React, TypeScript and Tailwind CSS v4.

## Layout

An npm workspaces monorepo (see [ADR-0001](./docs/adr/0001-workspaces-with-shared-core-and-cli-only-on-npm.md)):

- `packages/core`: private `@tracetrail/core`. Parsing, tree layout and SVG rendering, with no DOM dependency. Its public function `renderTrace` takes trace file text and returns SVG, and is tested against golden SVG fixtures in `packages/core/test/fixtures/`.
- `apps/web`: the React web app. Browser-only helpers (SVG/PNG export, clipboard) live here.

## Commands

Run from the repo root:

```sh
npm install
npm run dev        # web app dev server (vp dev)
npm run typecheck  # tsc in every workspace
npm test           # golden-SVG tests (vp test)
npm run build      # production build into apps/web/dist/
```

After an intended rendering change, regenerate the golden SVGs with `UPDATE_GOLDEN=1 npm test` and review the diff.

## Design

Trace Trail is growing into a web app plus a CLI (`npx trace-trail`) that agents use to add trail images to pull requests, both sharing one renderer. The vocabulary is in [GLOSSARY.md](./GLOSSARY.md) and the decisions behind the layout are in [docs/adr/](./docs/adr/).

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes `apps/web/dist/` to GitHub Pages.
One-time setup: in the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.

The build uses a relative `base` (`./`), so it works under `/tracetrail/` without further configuration.
