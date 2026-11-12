# pnpm replaces npm for development

The workspace is installed and run with pnpm (`packageManager` in `package.json`), as are the other repos it is maintained alongside. Workspace members are listed in `pnpm-workspace.yaml`, which also carries the Vite+ override and the 24-hour `minimumReleaseAge` that Dependabot's cooldown matches. Packages that import a workspace package declare it with `workspace:*`; npm's hoisting used to hide that the CLI never declared `@tracemap/core`.

Publishing is unchanged: semantic-release still packs and publishes `packages/cli` with npm, because npm trusted publishing (OIDC) needs npm itself. The CLI bundles core at build time, so the `workspace:*` devDependency in the published manifest is never installed by users.

Rejected alternatives:

- **Staying on npm here only**: one repo with a different package manager is a different set of commands for every agent and person moving between repos.
- **`pnpm publish`**: would also rewrite `workspace:*`, but semantic-release's npm plugin and trusted publishing are built on `npm publish`.
