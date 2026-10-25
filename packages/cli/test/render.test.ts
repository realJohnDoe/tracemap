import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import { COLOR_NAMES, EXAMPLE, renderTrail, type TrailSpec } from '@tracetrail/core'

const bin = fileURLToPath(new URL('../bin/tracetrail.js', import.meta.url))
const fixture = (f: string) => fileURLToPath(new URL(`../../core/test/fixtures/${f}`, import.meta.url))
const golden = (name: string) => readFileSync(fixture(`${name}.svg`), 'utf8')
const tmp = mkdtempSync(join(tmpdir(), 'tracetrail-'))

const run = (...args: string[]) => {
  const r = spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' })
  return { code: r.status, stdout: r.stdout, stderr: r.stderr }
}

const exampleFile = join(tmp, 'example.trace')
writeFileSync(exampleFile, EXAMPLE)
let n = 0
const out = () => join(tmp, `out${n++}.svg`)
const specFile = (spec: unknown) => {
  const f = join(tmp, `spec${n++}.json`)
  writeFileSync(f, JSON.stringify(spec))
  return f
}

describe('tracetrail render against the core golden SVGs', () => {
  it('draws the whole trace by default', () => {
    const o = out()
    expect(run('render', exampleFile, '-o', o).code).toBe(0)
    expect(readFileSync(o, 'utf8')).toBe(golden('no-highlight'))
  })

  it('applies --title and --highlight A-B', () => {
    const o = out()
    expect(run('render', exampleFile, '--title', 'Authentication', '--highlight', '4-9', '-o', o).code).toBe(0)
    expect(readFileSync(o, 'utf8')).toBe(golden('interval'))
  })

  it('accepts a single step as --highlight N', () => {
    const o = out()
    expect(run('render', fixture('simple.trace'), '--highlight', '2', '-o', o).code).toBe(0)
    expect(readFileSync(o, 'utf8')).toBe(golden('single-step'))
  })

  for (const color of COLOR_NAMES) {
    it(`draws --color ${color}`, () => {
      const o = out()
      expect(run('render', fixture('revisit.trace'), '--color', color, '--highlight', '2-4', '-o', o).code).toBe(0)
      expect(readFileSync(o, 'utf8')).toBe(golden(`color-${color}`))
    })
  }

  it('renders --spec byte-identically to core', () => {
    const spec: TrailSpec = { panels: [{ trace: EXAMPLE, title: 'Authentication', color: 'red', highlight: [4, 9] }] }
    const o = out()
    expect(run('render', '--spec', specFile(spec), '-o', o).code).toBe(0)
    expect(readFileSync(o, 'utf8')).toBe(renderTrail(spec) + '\n')
  })

  it('renders the same SVG from flags and from --spec', () => {
    const a = out(), b = out()
    run('render', exampleFile, '--title', 'T', '--color', 'purple', '--highlight', '3-6', '-o', a)
    run('render', '--spec', specFile({ panels: [{ trace: EXAMPLE, title: 'T', color: 'purple', highlight: [3, 6] }] }), '-o', b)
    expect(readFileSync(a, 'utf8')).toBe(readFileSync(b, 'utf8'))
  })
})

describe('tracetrail render errors', () => {
  const fails = (expected: RegExp, code: number, ...args: string[]) => {
    const r = run(...args)
    expect(r.code).toBe(code)
    expect(r.stderr).toMatch(expected)
    expect(r.stdout).toBe('')
  }
  const o = () => out()

  it('rejects an unknown color', () => fails(/Unknown color "pink".*blue, red/, 1, 'render', exampleFile, '--color', 'pink', '-o', o()))
  it('rejects a malformed highlight', () => {
    for (const h of ['abc', '1-', '-3', '0', '5-2', '1.5']) fails(/Malformed --highlight/, 1, 'render', exampleFile, `--highlight=${h}`, '-o', o())
  })
  it('rejects an out-of-range highlight', () => fails(/out of range: the trace has 16 steps/, 1, 'render', exampleFile, '--highlight', '10-99', '-o', o()))
  it('rejects an empty trace', () => {
    const f = join(tmp, 'empty.trace')
    writeFileSync(f, '# only a comment\n\n')
    fails(/trace has no steps/, 1, 'render', f, '-o', o())
  })
  it('rejects a missing trace file', () => fails(/Cannot read trace file/, 1, 'render', join(tmp, 'nope.trace'), '-o', o()))
  it('requires -o', () => fails(/required option '-o, --output <file>' not specified/, 2, 'render', exampleFile))
  it('requires a TRACE or --spec', () => fails(/exactly one TRACE/, 2, 'render', '-o', o()))
  it('rejects --spec combined with flags', () => fails(/cannot be combined/, 2, 'render', '--spec', specFile({}), '--color', 'red', '-o', o()))
  it('rejects an unknown flag and an unknown command', () => {
    fails(/unknown option '--bogus'/, 2, 'render', exampleFile, '--bogus', '-o', o())
    fails(/unknown command 'draw'/, 2, 'draw')
  })
  it('rejects invalid specs', () => {
    const bad = join(tmp, 'bad.json')
    writeFileSync(bad, '{nope')
    fails(/not valid JSON/, 1, 'render', '--spec', bad, '-o', o())
    fails(/needs "panels"/, 1, 'render', '--spec', specFile({}), '-o', o())
    fails(/Unknown color "pink"/, 1, 'render', '--spec', specFile({ panels: [{ trace: 'a.ts', color: 'pink' }] }), '-o', o())
    fails(/out of range/, 1, 'render', '--spec', specFile({ panels: [{ trace: 'a.ts', highlight: [1, 3] }] }), '-o', o())
    fails(/trace has no steps/, 1, 'render', '--spec', specFile({ panels: [{ trace: '' }] }), '-o', o())
  })
})

describe('tracetrail --help', () => {
  it('documents every flag with an example', () => {
    const r = run('render', '--help')
    expect(r.code).toBe(0)
    for (const s of ['--title', '--color', '--highlight', '--spec', '-o, --output', 'Examples:', ...COLOR_NAMES]) expect(r.stdout).toContain(s)
  })

  it('points the top-level help at render', () => {
    const r = run('--help')
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('Examples:')
    expect(r.stdout).toContain('tracetrail render --help')
  })

  it('shows help and exits 2 without arguments', () => {
    const r = run()
    expect(r.code).toBe(2)
    expect(r.stdout).toContain('Usage: tracetrail')
  })
})
