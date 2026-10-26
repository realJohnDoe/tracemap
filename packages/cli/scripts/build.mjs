// Bundles the CLI and @tracemap/core into one file; runtime dependencies stay external.
import { build } from 'esbuild'

await build({
  entryPoints: ['src/cli.ts'],
  outfile: 'dist/tracemap.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  banner: { js: '#!/usr/bin/env node' },
  alias: { '@tracemap/core': '../core/src/index.ts' },
})
