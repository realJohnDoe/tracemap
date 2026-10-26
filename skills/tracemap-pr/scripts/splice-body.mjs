#!/usr/bin/env node
// Replaces the trace map section of a PR body, or appends it if there is none yet.
// Usage: splice-body.mjs SECTION_FILE < current-body.md > new-body.md
// An empty SECTION_FILE removes the section.
import { readFileSync } from 'node:fs'

const START = '<!-- tracemap:start -->'
const END = '<!-- tracemap:end -->'

const [sectionFile] = process.argv.slice(2)
if (!sectionFile) {
  process.stderr.write('usage: splice-body.mjs SECTION_FILE < body.md > new-body.md\n')
  process.exit(2)
}
const body = readFileSync(0, 'utf8').replace(/\r\n/g, '\n')
const content = readFileSync(sectionFile, 'utf8').trim()
const section = content ? `${START}\n${content}\n${END}` : ''

// Markers count only on a line of their own, so text that quotes them is left alone.
const marked = body.match(new RegExp(`^${START}$[\\s\\S]*?^${END}$`, 'm'))
const [before, after] = marked
  ? [body.slice(0, marked.index), body.slice(marked.index + marked[0].length)]
  : [body, '']
const parts = [before.trimEnd(), section, after.trim()].filter(Boolean)
process.stdout.write(parts.join('\n\n') + '\n')
