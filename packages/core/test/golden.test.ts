import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import { COLOR_NAMES, EXAMPLE, renderTrail, type Panel, type Theme, type TrailSpec } from '../src'

const dir = (f: string) => fileURLToPath(new URL(`./fixtures/${f}`, import.meta.url))
const read = (f: string) => readFileSync(dir(f), 'utf8')

// Set UPDATE_GOLDEN=1 to regenerate the committed SVG fixtures after an intended rendering change.
const update = !!process.env.UPDATE_GOLDEN

const one = (panel: Panel, theme?: Theme) => renderTrail({ panels: [panel], theme })

const cases: { name: string; panel: () => Panel; theme?: Theme }[] = [
  { name: 'no-highlight', panel: () => ({ trace: EXAMPLE }) },
  { name: 'interval', panel: () => ({ trace: EXAMPLE, highlight: [4, 9], title: 'Authentication' }) },
  { name: 'single-step', panel: () => ({ trace: read('simple.trace'), highlight: [2, 2] }) },
  { name: 'repeated-visits', panel: () => ({ trace: read('revisit.trace'), highlight: [1, 4] }) },
  ...COLOR_NAMES.map((color) => ({ name: `color-${color}`, panel: (): Panel => ({ trace: read('revisit.trace'), color, highlight: [2, 4] }) })),
  { name: 'dark-interval', theme: 'dark', panel: () => ({ trace: EXAMPLE, highlight: [4, 9], title: 'Authentication' }) },
  { name: 'dark-single-step', theme: 'dark', panel: () => ({ trace: read('simple.trace'), highlight: [2, 2] }) },
  ...COLOR_NAMES.map((color) => ({ name: `dark-color-${color}`, theme: 'dark' as const, panel: (): Panel => ({ trace: read('revisit.trace'), color, highlight: [2, 4] }) })),
]

// Comparisons: two panels side by side on one tree (ADR-0005).
const comparisons: { name: string; spec: () => TrailSpec }[] = [
  {
    name: 'compare-bug-fix',
    spec: () => ({ panels: [
      { trace: read('bug-fix-before.trace'), title: 'before' },
      { trace: read('bug-fix-after.trace'), title: 'after' },
    ] }),
  },
  {
    name: 'compare-disjoint',
    spec: () => ({ panels: [
      { trace: read('disjoint-left.trace'), title: 'legacy', color: 'purple', highlight: [2, 3] },
      { trace: read('disjoint-right.trace'), title: 'rewrite', color: 'purple', highlight: [1, 1] },
    ] }),
  },
  {
    name: 'dark-compare-bug-fix',
    spec: () => ({ theme: 'dark', panels: [
      { trace: read('bug-fix-before.trace'), title: 'before' },
      { trace: read('bug-fix-after.trace'), title: 'after' },
    ] }),
  },
]

describe('renderTrail against golden SVGs', () => {
  const all = [
    ...cases.map((c) => ({ name: c.name, spec: (): TrailSpec => ({ panels: [c.panel()], theme: c.theme }) })),
    ...comparisons,
  ]
  for (const c of all) {
    it(c.name, () => {
      const svg = renderTrail(c.spec())
      const file = dir(`${c.name}.svg`)
      if (update) writeFileSync(file, svg + '\n')
      expect(svg + '\n').toBe(readFileSync(file, 'utf8'))
    })
  }

  it('returns an empty string for an empty trace', () => {
    expect(one({ trace: '# only a comment\n' })).toBe('')
  })

  it('renders light when no theme is given', () => {
    expect(one({ trace: EXAMPLE }, 'light')).toBe(one({ trace: EXAMPLE }))
  })

  it('clamps the highlight to the trace and accepts it in either order', () => {
    const trace = read('simple.trace')
    expect(one({ trace, highlight: [9, 2] })).toBe(one({ trace, highlight: [2, 3] }))
    expect(one({ trace, highlight: [-5, 99] })).toBe(one({ trace }))
  })
})

describe('renderTrail side by side', () => {
  const left = read('bug-fix-before.trace'), right = read('bug-fix-after.trace')
  const tops = (svg: string) => [...svg.matchAll(/<text x="[\d.]+" y="([\d.]+)" fill/g)].map((m) => m[1])

  it('draws both panels on the same tree, so every path gets a label in each', () => {
    const svg = renderTrail({ panels: [{ trace: left }, { trace: right }] })
    for (const name of ['limits.py', 'errors.py', 'disk.py']) expect(svg.split(`>${name}<`).length - 1).toBe(2)
    const ys = tops(svg)
    expect(ys.slice(0, ys.length / 2)).toEqual(ys.slice(ys.length / 2))
  })

  it('keeps the rows aligned when only one panel has a title', () => {
    const ys = tops(renderTrail({ panels: [{ trace: left, title: 'before' }, { trace: right }] }))
    expect(ys.slice(0, ys.length / 2)).toEqual(ys.slice(ys.length / 2))
  })

  it('draws an empty side as a neutral grey tree', () => {
    const svg = renderTrail({ panels: [{ trace: left }, { trace: '' }] })
    expect(svg).toContain('right: no steps')
    expect(renderTrail({ panels: [{ trace: '' }, { trace: '# none' }] })).toBe('')
  })
})
