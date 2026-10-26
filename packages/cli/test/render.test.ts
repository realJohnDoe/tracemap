import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import { COLOR_NAMES, EXAMPLE, cliCommand, normalizeSpec, renderTraceMap, type TraceMapSpec } from '@tracetrail/core'

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

  it('draws --dark-mode like the dark golden SVGs', () => {
    const o = out()
    expect(run('render', exampleFile, '--title', 'Authentication', '--highlight', '4-9', '--dark-mode', '-o', o).code).toBe(0)
    expect(readFileSync(o, 'utf8')).toBe(golden('dark-interval'))
  })

  for (const color of COLOR_NAMES) {
    it(`draws --dark-mode --color ${color}`, () => {
      const o = out()
      expect(run('render', fixture('revisit.trace'), '--color', color, '--highlight', '2-4', '--dark-mode', '-o', o).code).toBe(0)
      expect(readFileSync(o, 'utf8')).toBe(golden(`dark-color-${color}`))
    })
  }

  it('applies --dark-mode to a --spec', () => {
    const o = out()
    expect(run('render', '--spec', specFile({ panels: [{ trace: EXAMPLE }] }), '--dark-mode', '-o', o).code).toBe(0)
    expect(readFileSync(o, 'utf8')).toBe(renderTraceMap({ panels: [{ trace: EXAMPLE }], theme: 'dark' }) + '\n')
  })

  it('renders --spec byte-identically to core', () => {
    const spec: TraceMapSpec = { panels: [{ trace: EXAMPLE, title: 'Authentication', color: 'red', highlight: [4, 9] }] }
    const o = out()
    expect(run('render', '--spec', specFile(spec), '-o', o).code).toBe(0)
    expect(readFileSync(o, 'utf8')).toBe(renderTraceMap(spec) + '\n')
  })

  it('renders the same SVG from flags and from --spec', () => {
    const a = out(), b = out()
    run('render', exampleFile, '--title', 'T', '--color', 'purple', '--highlight', '3-6', '-o', a)
    run('render', '--spec', specFile({ panels: [{ trace: EXAMPLE, title: 'T', color: 'purple', highlight: [3, 6] }] }), '-o', b)
    expect(readFileSync(a, 'utf8')).toBe(readFileSync(b, 'utf8'))
  })
})

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe('tracetrail render --png', () => {
  it('writes a PNG with --png, even to a path without the extension', () => {
    const o = join(tmp, `img${n++}`)
    const r = run('render', exampleFile, '--png', '-o', o)
    expect(r.stderr).toBe('')
    expect(r.code).toBe(0)
    expect(readFileSync(o).subarray(0, 8).equals(PNG_MAGIC)).toBe(true)
  })

  it('writes a PNG when the output path ends in .png', () => {
    const o = join(tmp, `img${n++}.png`)
    expect(run('render', exampleFile, '--dark-mode', '-o', o).code).toBe(0)
    expect(readFileSync(o).subarray(0, 8).equals(PNG_MAGIC)).toBe(true)
  })

  it('draws text: the PNG is larger than one of a trace with no labels would be', () => {
    const o = out().replace(/\.svg$/, '.png')
    run('render', exampleFile, '-o', o)
    expect(readFileSync(o).length).toBeGreaterThan(5000)
  })
})

describe('tracetrail compare --dark-mode and --png', () => {
  const left = fixture('bug-fix-before.trace'), right = fixture('bug-fix-after.trace')

  it('draws --dark-mode like the dark golden SVG', () => {
    const o = out()
    expect(run('compare', left, right, '--dark-mode', '-o', o).code).toBe(0)
    expect(readFileSync(o, 'utf8')).toBe(golden('dark-compare-bug-fix'))
  })

  it('writes a PNG with --png', () => {
    const o = join(tmp, `cmp${n++}.png`)
    expect(run('compare', left, right, '--png', '-o', o).code).toBe(0)
    expect(readFileSync(o).subarray(0, 8).equals(PNG_MAGIC)).toBe(true)
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

describe('tracetrail compare against the core golden SVGs', () => {
  it('draws two panels side by side, titled before and after by default', () => {
    const o = out()
    expect(run('compare', fixture('bug-fix-before.trace'), fixture('bug-fix-after.trace'), '-o', o).code).toBe(0)
    expect(readFileSync(o, 'utf8')).toBe(golden('compare-bug-fix'))
  })

  it('applies the per-side flags', () => {
    const o = out()
    const r = run('compare', fixture('disjoint-left.trace'), fixture('disjoint-right.trace'),
      '--left-title', 'legacy', '--left-color', 'purple', '--left-highlight', '2-3',
      '--right-title', 'rewrite', '--right-color', 'purple', '--right-highlight', '1', '-o', o)
    expect(r.code).toBe(0)
    expect(readFileSync(o, 'utf8')).toBe(golden('compare-disjoint'))
  })

  it('renders the same SVG from compare flags and from a two-panel --spec', () => {
    const a = out(), b = out()
    const left = readFileSync(fixture('bug-fix-before.trace'), 'utf8'), right = readFileSync(fixture('bug-fix-after.trace'), 'utf8')
    run('compare', fixture('bug-fix-before.trace'), fixture('bug-fix-after.trace'),
      '--left-highlight', '2-4', '--right-color', 'green', '--right-title', '', '-o', a)
    const spec: TraceMapSpec = { panels: [{ trace: left, title: 'before', highlight: [2, 4] }, { trace: right, color: 'green' }] }
    expect(run('render', '--spec', specFile(spec), '-o', b).code).toBe(0)
    expect(readFileSync(a, 'utf8')).toBe(readFileSync(b, 'utf8'))
    expect(readFileSync(b, 'utf8')).toBe(renderTraceMap(spec) + '\n')
  })
})

describe('tracetrail compare errors', () => {
  const fails = (expected: RegExp, code: number, ...args: string[]) => {
    const r = run(...args)
    expect(r.code).toBe(code)
    expect(r.stderr).toMatch(expected)
  }
  const L = fixture('simple.trace'), R = fixture('revisit.trace')

  it('names the side of an invalid flag', () => {
    fails(/Right: Unknown color "pink"/, 1, 'compare', L, R, '--right-color', 'pink', '-o', out())
    fails(/Malformed --left-highlight "x"/, 1, 'compare', L, R, '--left-highlight', 'x', '-o', out())
    fails(/Left: Highlight 1-9 is out of range: the trace has 3 steps/, 1, 'compare', L, R, '--left-highlight', '1-9', '-o', out())
    fails(/Cannot read right trace file/, 1, 'compare', L, join(tmp, 'nope.trace'), '-o', out())
  })
  it('needs both traces and -o', () => {
    fails(/missing required argument 'right'/, 2, 'compare', L, '-o', out())
    fails(/required option '-o, --output <file>'/, 2, 'compare', L, R)
    fails(/Only one of LEFT and RIGHT/, 2, 'compare', '-', '-', '-o', out())
  })
})

describe('tracetrail --help', () => {
  it('documents every flag with an example', () => {
    const r = run('render', '--help')
    expect(r.code).toBe(0)
    for (const s of ['--title', '--color', '--highlight', '--spec', '-o, --output', 'Examples:', ...COLOR_NAMES]) expect(r.stdout).toContain(s)
  })

  it('documents every compare flag', () => {
    const r = run('compare', '--help')
    expect(r.code).toBe(0)
    for (const side of ['left', 'right']) for (const f of ['title', 'color', 'highlight']) expect(r.stdout).toContain(`--${side}-${f}`)
    expect(r.stdout).toContain('"before"')
    expect(r.stdout).toContain('"after"')
    expect(r.stdout).toContain('side by side')
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

describe('commands and specs exported by the web app', () => {
  const specs: TraceMapSpec[] = [
    { panels: [{ trace: EXAMPLE, title: "Bob's login", color: 'green', highlight: [4, 99] }], theme: 'dark' },
    { panels: [{ trace: EXAMPLE, title: 'before' }, { trace: EXAMPLE + 'src/new.py # added\n', title: '', highlight: [2, 5] }] },
  ]

  it.each(specs)('the copied command draws the same SVG as the web app', (spec) => {
    const dir = mkdtempSync(join(tmpdir(), 'tracetrail-cmd-'))
    const names = spec.panels.length === 1 ? ['trace.trace'] : ['left.trace', 'right.trace']
    spec.panels.forEach((p, i) => writeFileSync(join(dir, names[i]), p.trace))
    const words = cliCommand(spec).match(/'(?:[^']|'\\'')*'|\S+/g)!.map((w) => w.startsWith("'") ? w.slice(1, -1).replace(/'\\''/g, "'") : w)
    const r = spawnSync(process.execPath, [bin, ...words.slice(1)], { encoding: 'utf8', cwd: dir })
    expect(r.status).toBe(0)
    expect(readFileSync(join(dir, 'trace-map.svg'), 'utf8')).toBe(renderTraceMap(spec) + '\n')
  })

  it.each(specs)('the downloaded trace map spec works with --spec', (spec) => {
    const o = out()
    expect(run('render', '--spec', specFile(normalizeSpec(spec)), '-o', o).code).toBe(0)
    expect(readFileSync(o, 'utf8')).toBe(renderTraceMap(spec) + '\n')
  })
})
