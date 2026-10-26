import { describe, expect, it } from 'vite-plus/test'
import { EXAMPLE, cliCommand, decodeShareFragment, encodeShareFragment, renderTrail, type TrailSpec } from '../src'

const specs: Record<string, TrailSpec> = {
  single: { panels: [{ trace: EXAMPLE, title: 'Auth', color: 'green', highlight: [4, 9] }], theme: 'dark' },
  whole: { panels: [{ trace: EXAMPLE }] },
  compare: { panels: [{ trace: EXAMPLE, title: 'before' }, { trace: EXAMPLE + 'src/new.py # added\n', title: '', color: 'red', highlight: [2, 2] }] },
}

describe('share links', () => {
  for (const [name, spec] of Object.entries(specs)) {
    it(`round trip gives the same image: ${name}`, async () => {
      const fragment = await encodeShareFragment(spec)
      expect(fragment).toMatch(/^t=1\.[A-Za-z0-9_-]+$/)
      expect(renderTrail(await decodeShareFragment('#' + fragment))).toBe(renderTrail(spec))
    })
  }

  it('clamps a highlight beyond the trace so the spec works with --spec', async () => {
    const spec: TrailSpec = { panels: [{ trace: 'a.ts\nb.ts', highlight: [2, 9] }] }
    expect((await decodeShareFragment(await encodeShareFragment(spec))).panels[0].highlight).toEqual([2, 2])
  })

  it('rejects malformed and truncated links with a message', async () => {
    const good = await encodeShareFragment(specs.single)
    for (const bad of ['', 't=', 't=1.', 't=1.!!!', 't=1.AAAA', good.slice(0, good.length / 2), 't=2.' + good.slice(4), 'x=1']) {
      await expect(decodeShareFragment(bad)).rejects.toThrow(/link/)
    }
  })
})

describe('cliCommand', () => {
  it('names only the settings that differ from the defaults', () => {
    expect(cliCommand({ panels: [{ trace: 'a\nb' }] })).toBe('tracetrail render trace.trace -o trail.svg')
    expect(cliCommand(specs.single)).toBe("tracetrail render trace.trace --title Auth --color green --highlight 4-9 --dark-mode -o trail.svg")
  })

  it('quotes titles for the shell', () => {
    expect(cliCommand({ panels: [{ trace: 'a', title: "it's a trail" }] })).toBe(`tracetrail render trace.trace --title 'it'\\''s a trail' -o trail.svg`)
  })

  it('compares two files and keeps the before and after titles by default', () => {
    expect(cliCommand(specs.compare)).toBe("tracetrail compare left.trace right.trace --right-title '' --right-color red --right-highlight 2 -o trail.svg")
  })
})
