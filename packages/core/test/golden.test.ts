import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import { EXAMPLE, renderTrace, type RenderOptions } from '../src'

const dir = (f: string) => fileURLToPath(new URL(`./fixtures/${f}`, import.meta.url))
const read = (f: string) => readFileSync(dir(f), 'utf8')

// Set UPDATE_GOLDEN=1 to regenerate the committed SVG fixtures after an intended rendering change.
const update = !!process.env.UPDATE_GOLDEN

const cases: { name: string; trace: () => string; options: RenderOptions }[] = [
  { name: 'simple', trace: () => read('simple.trace'), options: { step: 1 } },
  { name: 'revisit', trace: () => read('revisit.trace'), options: { step: 3, trail: 2, showAll: false } },
  { name: 'example', trace: () => EXAMPLE, options: { step: 5 } },
]

describe('renderTrace against golden SVGs', () => {
  for (const c of cases) {
    it(c.name, () => {
      const svg = renderTrace(c.trace(), c.options)
      const file = dir(`${c.name}.svg`)
      if (update) writeFileSync(file, svg + '\n')
      expect(svg + '\n').toBe(readFileSync(file, 'utf8'))
    })
  }

  it('returns an empty string for an empty trace', () => {
    expect(renderTrace('# only a comment\n')).toBe('')
  })
})
