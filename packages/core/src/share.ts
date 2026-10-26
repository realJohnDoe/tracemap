import { COLOR_NAMES, type Panel, type TraceMapSpec } from './spec'
import { parseTrace } from './trace'

/** Prefix of the share link fragment; the number is the format version (ADR-0011). */
const PREFIX = 't=1.'

/** Thrown when a share link or a spec cannot be turned into a trace map spec. */
export class ShareError extends Error {}

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (text: string): Uint8Array => {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new ShareError('The link contains characters that are not part of a share link.')
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

const pipe = async (data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> => {
  const writer = stream.writable.getWriter()
  // Errors surface on the readable side; a rejected write would only be reported twice.
  writer.write(data as Uint8Array<ArrayBuffer>).catch(() => {})
  writer.close().catch(() => {})
  return new Uint8Array(await new Response(stream.readable).arrayBuffer())
}

/**
 * Makes a trace map spec exact and portable: highlights are clamped to the trace, defaults are dropped
 * and empty titles removed, so the same image always gives the same JSON.
 */
export function normalizeSpec(spec: TraceMapSpec): TraceMapSpec {
  const panel = (p: Panel): Panel => {
    const out: Panel = { trace: p.trace }
    if (p.title) out.title = p.title
    if (p.color && p.color !== 'blue') out.color = p.color
    if (p.highlight) {
      const n = Math.max(parseTrace(p.trace).length, 1)
      const clamp = (k: number) => Math.min(Math.max(k, 1), n)
      out.highlight = [clamp(p.highlight[0]), clamp(p.highlight[1])]
    }
    return out
  }
  const panels = spec.panels.map(panel) as TraceMapSpec['panels']
  return spec.theme === 'dark' ? { panels, theme: 'dark' } : { panels }
}

/** Checks parsed JSON and returns it as a trace map spec, or throws a ShareError saying what is wrong. */
export function checkSpec(raw: unknown): TraceMapSpec {
  const spec = raw as Partial<TraceMapSpec> | null
  if (!spec || typeof spec !== 'object' || !Array.isArray(spec.panels) || spec.panels.length < 1 || spec.panels.length > 2) {
    throw new ShareError('The link does not hold a trace map spec with one or two panels.')
  }
  if (spec.theme !== undefined && spec.theme !== 'light' && spec.theme !== 'dark') throw new ShareError('The link holds an unknown theme.')
  for (const p of spec.panels as Partial<Panel>[]) {
    if (!p || typeof p.trace !== 'string') throw new ShareError('The link holds a panel without a trace.')
    if (p.title !== undefined && typeof p.title !== 'string') throw new ShareError('The link holds a panel with a malformed title.')
    if (p.color !== undefined && !(COLOR_NAMES as readonly unknown[]).includes(p.color)) throw new ShareError('The link holds an unknown color.')
    const h = p.highlight as unknown
    if (h !== undefined && !(Array.isArray(h) && h.length === 2 && h.every((k) => Number.isInteger(k) && k >= 1) && h[0] <= h[1])) {
      throw new ShareError('The link holds a malformed highlight.')
    }
  }
  return spec as TraceMapSpec
}

/** The share link fragment (without the leading "#") for a trace map spec (ADR-0011). */
export async function encodeShareFragment(spec: TraceMapSpec): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(normalizeSpec(spec)))
  return PREFIX + toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))
}

/** Reads a share link fragment (with or without the leading "#"); throws a ShareError if it is malformed or truncated. */
export async function decodeShareFragment(fragment: string): Promise<TraceMapSpec> {
  const text = fragment.replace(/^#/, '')
  if (!text.startsWith('t=')) throw new ShareError('The link does not hold a trace map spec.')
  if (!text.startsWith(PREFIX)) throw new ShareError('The link was made by a newer version of Trace Trail that this page cannot read.')
  let json: string
  try {
    const bytes = await pipe(fromBase64Url(text.slice(PREFIX.length)), new DecompressionStream('deflate-raw'))
    json = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch (e) {
    if (e instanceof ShareError) throw e
    throw new ShareError('The link is malformed or truncated.')
  }
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new ShareError('The link is malformed or truncated.')
  }
  return checkSpec(raw)
}

/** Quotes a word for a POSIX shell, only when it needs it. */
const quote = (s: string): string => (/^[A-Za-z0-9_./=:,@%+-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`)

/**
 * The `tracetrail render` or `tracetrail compare` command that draws the same SVG as the spec,
 * run on trace files named trace.trace (render) or left.trace and right.trace (compare).
 */
export function cliCommand(spec: TraceMapSpec, output = 'trace-map.svg'): string {
  const { panels, theme } = normalizeSpec(spec)
  const words: string[] = ['tracetrail']
  const add = (flag: string, value?: string) => words.push(flag, ...(value === undefined ? [] : [quote(value)]))
  const dark = () => { if (theme === 'dark') add('--dark-mode') }

  if (panels.length === 1) {
    const [p] = panels
    words.push('render', 'trace.trace')
    if (p.title) add('--title', p.title)
    if (p.color) add('--color', p.color)
    if (p.highlight) add('--highlight', p.highlight[0] === p.highlight[1] ? String(p.highlight[0]) : p.highlight.join('-'))
  } else {
    words.push('compare', 'left.trace', 'right.trace')
    const sides = [['left', 'before'], ['right', 'after']] as const
    sides.forEach(([name, fallback], i) => {
      const p = panels[i]
      if ((p.title ?? '') !== fallback) add(`--${name}-title`, p.title ?? '')
      if (p.color) add(`--${name}-color`, p.color)
      if (p.highlight) add(`--${name}-highlight`, p.highlight[0] === p.highlight[1] ? String(p.highlight[0]) : p.highlight.join('-'))
    })
  }
  dark()
  add('-o', output)
  return words.join(' ')
}
