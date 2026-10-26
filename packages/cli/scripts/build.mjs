// Bundles the CLI with @tracetrail/core into dist/main.js (ADR-0001). Dependencies stay external:
// resvg is a native addon, and commander is installed with the package.
import { build } from 'esbuild'

await build({
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  packages: 'external',
  alias: { '@tracetrail/core': '../core/src/index.ts' },
})
