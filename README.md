# Trace Trail

Follows a trace through a directory tree, step by step. Built with [Vite+](https://viteplus.dev), React, TypeScript and Tailwind CSS v4.

```sh
npm install
npm run dev      # local dev server (vp dev)
npm run build    # type-check + production build into dist/
```

## Design

Trace Trail is growing into a web app plus a CLI (`npx trace-trail`) that agents use to add trail images to pull requests, both sharing one renderer. The vocabulary is in [GLOSSARY.md](./GLOSSARY.md) and the decisions behind the layout are in [docs/adr/](./docs/adr/).

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes `dist/` to GitHub Pages.
One-time setup: in the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.

The build uses a relative `base` (`./`), so it works under `/tracetrail/` without further configuration.
