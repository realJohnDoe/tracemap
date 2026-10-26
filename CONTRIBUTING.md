# Contributing

Thanks for helping with Trace Map. This page is for people working on the code; for using the app and the CLI see the [README](./README.md).

## Design docs

Read [GLOSSARY.md](./GLOSSARY.md) and the ADRs in [docs/adr/](./docs/adr/) before changing behaviour, and use the glossary's terms in code, issues and CLI flags. Trace Map is a web app plus a CLI (`npx @realjohndoe/tracemap`) that agents use to add trace maps to pull requests, both sharing one renderer.

## Layout

An npm workspaces monorepo (see [ADR-0001](./docs/adr/0001-workspaces-with-shared-core-and-cli-only-on-npm.md)), built with [Vite+](https://viteplus.dev), React, TypeScript and Tailwind CSS v4:

- `packages/core`: private `@tracemap/core`. Parsing, tree layout and SVG rendering, with no DOM dependency. Its public interface is the trace map spec type and `renderTraceMap`, which takes a trace map spec and returns SVG; it is tested against golden SVG fixtures in `packages/core/test/fixtures/`.
- `packages/cli`: the `tracemap` command, published to npm as `@realjohndoe/tracemap` with core bundled in (`npm run build -w @realjohndoe/tracemap` bundles it into `dist/`). In the workspace it runs from the TypeScript sources without a build step, so `packages/cli/bin/tracemap.js` is the entry point for tests.
- `apps/web`: the React web app. Browser-only helpers (SVG/PNG export, clipboard) live here.
- `skills/`: agent skills, see [PR skill](#pr-skill).

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

After `npm install`, run the workspace CLI from the repo root with `npx tracemap`. The agent skills use the published `npx --yes @realjohndoe/tracemap@latest` instead, so a skill change that needs a new CLI feature only works once that feature is released.

## PR skill

Two agent skills add trace maps to pull request descriptions (ADR-0007, ADR-0008). `skills/tracemap-images/` decides whether images help, writes the traces, renders them with the published CLI and writes the images and their description into a directory it is given; it knows nothing about pull requests and can be used directly for docs, ADRs, tutorials and issues. `skills/tracemap-pr/` calls it, defines which files it must hand back, and gets them into the PR. Both are linked into `.claude/skills/` so Claude Code sessions in this repo find them. The PR skill uploads images with `gh` 2.99+ (installing the latest release into `~/.local/bin` if needed). Where uploads are blocked, as in Claude Code cloud sessions, it commits them to a `tracemap-assets` branch instead and links them by commit (ADR-0007).

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes `apps/web/dist/` to GitHub Pages.
One-time setup: in the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.

The build uses a relative `base` (`./`), so it works under `/tracemap/` without further configuration.
