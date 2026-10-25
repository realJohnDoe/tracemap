# Trace Trail

Follows a trace through a directory tree, step by step. Built with Vite, React, TypeScript and Tailwind CSS v4.

```sh
npm install
npm run dev      # local dev server
npm run build    # type-check + production build into dist/
```

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes `dist/` to GitHub Pages.
One-time setup: in the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.

The build uses a relative `base` (`./`), so it works under `/tracetrail/` without further configuration.
