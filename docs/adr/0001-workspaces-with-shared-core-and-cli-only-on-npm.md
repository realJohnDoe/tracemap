# Workspaces with a shared core; only the CLI ships to npm

The web app and an agent-facing CLI must draw identical trace maps, so the repo becomes an npm workspaces monorepo: `packages/core` (parsing, layout, SVG rendering; no DOM), `packages/cli` and `apps/web`, plus the agent skill under `skills/`. Only the CLI is published, as the unscoped package `tracemap` with the command `tracemap`; core is a private workspace package bundled into the CLI and imported directly by the web app. The web app stays a static site on GitHub Pages with no server.

## Considered Options

- **One package with `src/core`, `src/cli`, `src/web`**: simpler, but the CLI could not be versioned and published on its own.
- **Publishing `@tracemap/core` as well**: no consumer outside this repo needs it yet, and it would require an npm organisation. Revisit if someone wants to embed the renderer.
- **The name `tracemap` on npm**: taken by an unrelated package.
- **An HTTP render API**: a server to run and pay for, with nothing it does that the static app plus the CLI cannot.
