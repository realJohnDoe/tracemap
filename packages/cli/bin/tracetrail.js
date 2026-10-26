#!/usr/bin/env node
// In the workspace, runs the TypeScript sources straight away, so no build step is needed.
// In the published package there is no src/, so it runs the bundle from `npm run build`.
import { existsSync } from 'node:fs'

let entry
if (existsSync(new URL('../src/main.ts', import.meta.url))) {
  const { register } = await import('tsx/esm/api')
  register()
  entry = '../src/main.ts'
} else {
  entry = '../dist/main.js'
}
const { main } = await import(entry)
process.exitCode = await main(process.argv.slice(2))
