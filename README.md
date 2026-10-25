# Trace Trail

Draws the route a trace takes through a directory tree, with one highlighted interval of steps. Built with [Vite+](https://viteplus.dev), React, TypeScript and Tailwind CSS v4.

## Layout

An npm workspaces monorepo (see [ADR-0001](./docs/adr/0001-workspaces-with-shared-core-and-cli-only-on-npm.md)):

- `packages/core`: private `@tracetrail/core`. Parsing, tree layout and SVG rendering, with no DOM dependency. Its public interface is the trail spec type and `renderTrail`, which takes a trail spec and returns SVG; it is tested against golden SVG fixtures in `packages/core/test/fixtures/`.
- `packages/cli`: the `tracetrail` command (published later as `trace-trail`), with core bundled in. It runs from the workspace without a build step.
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

## CLI

After `npm install`, run the CLI from the repo root with `npx tracetrail`. `render` draws a trace file as an SVG (or PNG):

```sh
tracetrail render TRACE [--title T] [--color C] [--highlight N|A-B] [--dark-mode] [--png] -o out.svg
tracetrail render --spec trail.json [--dark-mode] [--png] -o out.svg
```

- `TRACE`: a trace file, one step per line (`-` reads stdin).
- `--title T`: title above the tree.
- `--color C`: `blue` (default), `red`, `green`, `orange`, `purple` or `gray`.
- `--highlight N|A-B`: 1-based step numbers to draw in color, e.g. `3` or `2-5`. Default: the whole trace.
- `--spec FILE`: a trail spec as JSON (`{"panels": [{"trace": "...", "title": "...", "color": "red", "highlight": [2, 5]}]}`) instead of `TRACE` and the flags above.
- `--dark-mode`: draw the dark theme instead of the light one ([ADR-0006](./docs/adr/0006-svg-first-system-monospace-named-colors.md)). With `--spec` it overrides the spec's `theme`. The web app has the same switch as **Dark theme**, for both single traces and comparisons, and a trail spec can set `"theme": "dark"`.
- `--png`: write a PNG instead of an SVG; an output path ending in `.png` does the same. The conversion uses `@resvg/resvg-js` and needs no browser, but it needs a monospace font installed (for example DejaVu Sans Mono or Liberation Mono in a bare container image). Without one the command exits with an error instead of writing a PNG without text ([ADR-0010](./docs/adr/0010-png-is-rendered-with-resvg-js-and-needs-an-installed-monospace-font.md)). PNG bytes depend on the installed fonts, so only SVG output is byte-for-byte reproducible.
- `-o, --output FILE`: where to write the image (required).

`compare` draws two trace files as one comparison: two panels side by side on the same tree, built from the paths of both traces, so every path sits at the same height in both panels and paths only one trace visits stay neutral grey in the other:

```sh
tracetrail compare LEFT RIGHT \
  [--left-title T] [--left-color C] [--left-highlight N|A-B] \
  [--right-title T] [--right-color C] [--right-highlight N|A-B] \
  [--dark-mode] [--png] -o out.svg
```

Titles default to `before` and `after` (`""` for none); both sides default to the same color. A trail spec with two panels renders the same image through `render --spec`. `--dark-mode` and `--png` work as for `render`. The web app's Compare mode builds the same trail spec.

Invalid input (unknown color, malformed or out-of-range highlight, empty trace, bad spec) prints a message to stderr and exits 1; usage errors exit 2. `tracetrail --help` lists everything with examples.

## Design

Trace Trail is growing into a web app plus a CLI (`npx trace-trail`) that agents use to add trail images to pull requests, both sharing one renderer. The vocabulary is in [GLOSSARY.md](./GLOSSARY.md) and the decisions behind the layout are in [docs/adr/](./docs/adr/).

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes `apps/web/dist/` to GitHub Pages.
One-time setup: in the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.

The build uses a relative `base` (`./`), so it works under `/tracetrail/` without further configuration.
