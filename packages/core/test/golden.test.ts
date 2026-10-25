import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import { COLOR_NAMES, EXAMPLE, renderTrail, type Panel } from '../src'

const dir = (f: string) => fileURLToPath(new URL(`./fixtures/${f}`, import.meta.url))
const read = (f: string) => readFileSync(dir(f), 'utf8')

// Set UPDATE_GOLDEN=1 to regenerate the committed SVG fixtures after an intended rendering change.
const update = !!process.env.UPDATE_GOLDEN

const one = (panel: Panel) => renderTrail({ panels: [panel] })

const cases: { name: string; panel: () => Panel }[] = [
  { name: 'no-highlight', panel: () => ({ trace: EXAMPLE }) },
  { name: 'interval', panel: () => ({ trace: EXAMPLE, highlight: [4, 9], title: 'Authentication' }) },
  { name: 'single-step', panel: () => ({ trace: read('simple.trace'), highlight: [2, 2] }) },
  { name: 'repeated-visits', panel: () => ({ trace: read('revisit.trace'), highlight: [1, 4] }) },
  ...COLOR_NAMES.map((color) => ({ name: `color-${color}`, panel: (): Panel => ({ trace: read('revisit.trace'), color, highlight: [2, 4] }) })),
]

describe('renderTrail against golden SVGs', () => {
  for (const c of cases) {
    it(c.name, () => {
      const svg = one(c.panel())
      const file = dir(`${c.name}.svg`)
      if (update) writeFileSync(file, svg + '\n')
      expect(svg + '\n').toBe(readFileSync(file, 'utf8'))
    })
  }

  it('returns an empty string for an empty trace', () => {
    expect(one({ trace: '# only a comment\n' })).toBe('')
  })

  it('clamps the highlight to the trace and accepts it in either order', () => {
    const trace = read('simple.trace')
    expect(one({ trace, highlight: [9, 2] })).toBe(one({ trace, highlight: [2, 3] }))
    expect(one({ trace, highlight: [-5, 99] })).toBe(one({ trace }))
  })
})
