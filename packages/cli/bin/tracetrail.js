#!/usr/bin/env node
// Runs the TypeScript sources straight from the workspace, so no build step is needed.
import { register } from 'tsx/esm/api'

register()
const { main } = await import('../src/main.ts')
process.exitCode = await main(process.argv.slice(2))
