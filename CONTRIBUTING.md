# Contributing

Thanks for helping with Trace Trail. This page is for people working on the code; for using the app and the CLI see the [README](./README.md).

## Design docs

Read [GLOSSARY.md](./GLOSSARY.md) and the ADRs in [docs/adr/](./docs/adr/) before changing behaviour, and use the glossary's terms in code, issues and CLI flags. Trace Trail is a web app plus a CLI (`npx trace-trail`) that agents use to add trail images to pull requests, both sharing one renderer.

## Layout

An npm workspaces monorepo (see [ADR-0001](./docs/adr/0001-workspaces-with-shared-core-and-cli-only-on-npm.md)), built with [Vite+](https://viteplus.dev), React, TypeScript and Tailwind CSS v4:

- `packages/core`: private `@tracetrail/core`. Parsing, tree layout and SVG rendering, with no DOM dependency. Its public interface is the trail spec type and `renderTrail`, which takes a trail spec and returns SVG; it is tested against golden SVG fixtures in `packages/core/test/fixtures/`.
- `packages/cli`: the `tracetrail` command (published later as `trace-trail`), with core bundled in. It runs from the workspace without a build step.
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

After `npm install`, run the CLI from the repo root with `npx tracetrail`.

## PR skill

Two agent skills add trail images to pull request descriptions (ADR-0007, ADR-0008). `skills/tracetrail-images/` decides whether images help, writes the traces, renders them with the CLI from the workspace and writes the images and their description into a directory it is given; it knows nothing about pull requests and can be used directly for docs, ADRs, tutorials and issues. `skills/tracetrail-pr/` calls it, defines which files it must hand back, and gets them into the PR. Both are linked into `.claude/skills/` so Claude Code sessions in this repo find them. The PR skill uploads images with `gh` 2.99+ (installing the latest release into `~/.local/bin` if needed). Where uploads are blocked, as in Claude Code cloud sessions, it commits them to a `tracetrail-assets` branch instead and links them by commit (ADR-0007).

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes `apps/web/dist/` to GitHub Pages.
One-time setup: in the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.

The build uses a relative `base` (`./`), so it works under `/tracetrail/` without further configuration.
