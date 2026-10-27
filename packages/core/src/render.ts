import { PALETTES, type Palette, type Panel, type TraceMapSpec } from './spec'
import { buildTree, parseTrace, type Row, type Step } from './trace'

const ROW = 28, IND = 16, PADL = 34, PADT = 18, CW = 7.8, PADR = 16
const TITLE_SIZE = 14, TITLE_H = 30
const CORNER = 6
// space between two panels side by side, with a neutral divider in its middle
const GAP = 32

export const FONT_FAMILY = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const px = (n: number) => Math.round(n * 10) / 10

type Point = [number, number]

/** A polyline as path data, each turn rounded with CORNER, capped at half of either adjacent segment. */
function rounded(points: Point[]): string {
  const P: Point[] = []
  for (const p of points) {
    const q = P[P.length - 1]
    if (q && q[0] === p[0] && q[1] === p[1]) continue
    const o = P[P.length - 2]
    if (o) {
      // drop q when it lies on a straight run from o through p
      const cross = (q[0] - o[0]) * (p[1] - q[1]) - (q[1] - o[1]) * (p[0] - q[0])
      const dot = (q[0] - o[0]) * (p[0] - q[0]) + (q[1] - o[1]) * (p[1] - q[1])
      if (cross === 0 && dot > 0) P.pop()
    }
    P.push(p)
  }
  if (P.length < 2) return ''
  const f = (p: Point) => px(p[0]) + ' ' + px(p[1])
  let d = 'M' + f(P[0])
  for (let i = 1; i < P.length - 1; i++) {
    const [a, b, c] = [P[i - 1], P[i], P[i + 1]]
    const lab = Math.hypot(b[0] - a[0], b[1] - a[1]), lbc = Math.hypot(c[0] - b[0], c[1] - b[1])
    const r = Math.min(CORNER, lab / 2, lbc / 2)
    const p1: Point = [b[0] - ((b[0] - a[0]) / lab) * r, b[1] - ((b[1] - a[1]) / lab) * r]
    const p2: Point = [b[0] + ((c[0] - b[0]) / lbc) * r, b[1] + ((c[1] - b[1]) / lbc) * r]
    d += 'L' + f(p1) + 'Q' + f(b) + ' ' + f(p2)
  }
  return d + 'L' + f(P[P.length - 1])
}

interface DrawnPanel {
  width: number
  /** SVG elements in the panel's own coordinates, without the background. */
  body: string[]
  /** What the highlight covers, for the image's aria-label. */
  what: string
}

/**
 * Draws one panel on a tree that may hold more paths than its own trace visits.
 * `top` is where the tree starts, so panels side by side keep their rows aligned.
 */
function drawPanel(panel: Panel, steps: Step[], rows: Row[], top: number, pal: Palette): DrawnPanel {
  const color = pal.colors[panel.color ?? 'blue']
  const title = panel.title?.trim() ?? ''

  // The highlight as zero-based step indices, whole trace by default; empty when there are no steps.
  const n = steps.length
  const clamp = (k: number) => Math.min(Math.max(Math.round(k), 1), n)
  const [a, b] = panel.highlight ?? [1, n]
  const lo = n ? clamp(Math.min(a, b)) - 1 : 0, hi = n ? clamp(Math.max(a, b)) - 1 : -1

  const byPath = new Map(rows.map((r) => [r.path, r]))
  const rowOf = (k: number) => byPath.get(steps[k].path)!
  const X = (r: Row) => PADL + r.depth * IND
  const Y = (r: Row) => top + r.row * ROW + ROW / 2
  const RX = PADL - IND
  const labelLen = (r: Row) => r.name.length + (r.isDir ? 1 : 0)

  // Step numbers restart at 1 at the first highlighted step.
  const nums = new Map<Row, number[]>()
  for (let k = lo; k <= hi; k++) {
    const r = rowOf(k)
    if (!nums.has(r)) nums.set(r, [])
    nums.get(r)!.push(k - lo + 1)
  }
  const pill = (r: Row) => {
    const txt = nums.get(r)!.join(' · ')
    return { txt, x: X(r) + 11 + labelLen(r) * CW + 8, w: txt.length * 6.6 + 12 }
  }

  let right = title ? RX + title.length * TITLE_SIZE * 0.6 : 0
  for (const r of rows) {
    if (nums.has(r)) { const p = pill(r); right = Math.max(right, p.x + p.w) }
    else right = Math.max(right, X(r) + 11 + labelLen(r) * CW)
  }
  const W = Math.ceil(right + PADR)

  const what = !n ? 'no steps' : lo === hi ? `step ${lo + 1} of ${n} highlighted` : `steps ${lo + 1} to ${hi + 1} of ${n} highlighted`
  const o: string[] = []
  if (title) o.push(`<text x="${RX}" y="${PADT + TITLE_SIZE}" font-size="${TITLE_SIZE}" font-weight="600" fill="${pal.ink}">${esc(title)}</text>`)

  // row tint behind every row the highlight visits
  for (const r of rows) {
    if (!nums.has(r)) continue
    o.push(`<rect x="${X(r) - 14}" y="${top + r.row * ROW + 2}" width="${W - (X(r) - 14) - 8}" height="${ROW - 4}" rx="4" fill="${color}" opacity="0.12"/>`)
  }

  const line = (d: string, stroke: string, width: number) =>
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`

  // tree guides: an elbow from each parent's rail to each child
  const tops = rows.filter((r) => r.depth === 0)
  let tree = ''
  for (const r of rows) {
    const from: Point = r.parent ? [X(r.parent), Y(r.parent)] : [RX, Y(tops[0])]
    tree += rounded([from, [from[0], Y(r)], [X(r), Y(r)]])
  }
  o.push(line(tree, pal.neutralLine, 2))

  // tree node circles, under the trace line
  for (const r of rows) {
    if (nums.has(r)) continue
    o.push(`<circle cx="${X(r)}" cy="${Y(r)}" r="2.5" fill="${pal.neutralLine}"/>`)
  }

  // The trace line runs along the tree's own rails: up from p to the common ancestor, then down to q.
  const seg = (p: Row, q: Row): string => {
    if (p === q) return ''
    const anc = (m: Row) => { const c: Row[] = []; for (let x: Row | null = m; x; x = x.parent) c.push(x); return c }
    const cq = anc(q)
    let L: Row | null = null
    for (const m of anc(p)) if (cq.includes(m)) { L = m; break }
    const xL = L ? X(L) : RX
    const P: Point[] = [[X(p), Y(p)]]
    let m = p
    if (m !== L) {
      while (m.parent !== L) { P.push([X(m) - IND, Y(m)], [X(m) - IND, Y(m.parent!)]); m = m.parent! }
      P.push([xL, Y(m)])
    }
    const down: Row[] = []
    for (let x: Row | null = q; x !== L; x = x!.parent) down.unshift(x!)
    if (!down.length) P.push([xL, Y(L!)])
    else {
      P.push([xL, Y(down[0])])
      down.forEach((x, i) => { P.push([X(x), Y(x)]); if (i + 1 < down.length) P.push([X(x), Y(down[i + 1])]) })
    }
    return rounded(P)
  }
  // segment k leads from step k-1 to step k; it is highlighted when both ends are
  let grey = '', hl = ''
  for (let k = 1; k < n; k++) {
    const d = seg(rowOf(k - 1), rowOf(k))
    if (k > lo && k <= hi) hl += d
    else grey += d
  }
  if (grey) o.push(line(grey, pal.neutralLine, 2))
  if (hl) o.push(line(hl, color, 3))

  // a disc where the highlight starts, a target where it ends, a dot on every other visited row
  const start = n ? rowOf(lo) : null, end = n ? rowOf(hi) : null
  for (const r of rows) {
    if (!nums.has(r)) continue
    const x = X(r), y = Y(r)
    if (r === end) {
      o.push(`<circle cx="${x}" cy="${y}" r="5" fill="${pal.background}" stroke="${color}" stroke-width="3"/>`)
      o.push(`<circle cx="${x}" cy="${y}" r="1.5" fill="${color}"/>`)
    } else if (r === start) {
      o.push(`<circle cx="${x}" cy="${y}" r="6" fill="${color}"/>`)
    } else {
      o.push(`<circle cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`)
    }
  }

  // labels, and step numbers after the highlighted ones
  for (const r of rows) {
    const y = Y(r)
    const name = esc(r.name) + (r.isDir ? '/' : '')
    const on = nums.has(r)
    const weight = on || r.isDir ? ' font-weight="600"' : ''
    o.push(`<text x="${X(r) + 11}" y="${y + 4.5}" fill="${on ? pal.ink : pal.neutralLabel}"${weight}>${name}</text>`)
    if (!on) continue
    const p = pill(r)
    o.push(`<rect x="${px(p.x)}" y="${y - 8}" width="${px(p.w)}" height="16" rx="8" fill="${pal.background}" stroke="${color}" stroke-width="1.6"/>`)
    o.push(`<text x="${px(p.x + p.w / 2)}" y="${y + 3.8}" text-anchor="middle" font-size="11" font-weight="600" fill="${color}">${p.txt}</text>`)
  }
  return { width: W, body: o, what }
}

/**
 * Trace map spec in, SVG out: the public seam the web app, the CLI and the golden tests all run through.
 * Two panels are drawn side by side on one tree built from both traces, so their rows line up (ADR-0005).
 * Returns an empty string when no panel's trace has any steps.
 */
export function renderTraceMap(spec: TraceMapSpec): string {
  const pal = PALETTES[spec.theme ?? 'light']
  const traces = spec.panels.map((p) => parseTrace(p.trace))
  if (!traces.some((t) => t.length)) return ''
  const rows = buildTree(traces.flat())
  const top = PADT + (spec.panels.some((p) => p.title?.trim()) ? TITLE_H : 0)
  const drawn = spec.panels.map((p, i) => drawPanel(p, traces[i], rows, top, pal))
  const H = top + rows.length * ROW + PADT

  const titleOf = (i: number) => spec.panels[i].title?.trim() ?? ''
  let W: number, label: string
  if (drawn.length === 1) {
    W = drawn[0].width
    label = (titleOf(0) ? titleOf(0) + ': ' : '') + 'Trace through the directory tree, ' + drawn[0].what
  } else {
    W = drawn[0].width + GAP + drawn[1].width
    const side = (i: number) => (titleOf(i) || (i ? 'right' : 'left')) + ': ' + drawn[i].what
    label = 'Two traces side by side on the same directory tree. ' + side(0) + '; ' + side(1)
  }

  const o: string[] = []
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT_FAMILY}" font-size="13" role="img" aria-label="${esc(label)}">`)
  o.push(`<rect width="${W}" height="${H}" fill="${pal.background}"/>`)
  o.push(...drawn[0].body)
  if (drawn.length > 1) {
    const x = drawn[0].width + GAP / 2
    o.push(`<path d="M${x} ${PADT}L${x} ${H - PADT}" stroke="${pal.neutralLine}" stroke-width="1"/>`)
    o.push(`<g transform="translate(${drawn[0].width + GAP} 0)">`, ...drawn[1].body, '</g>')
  }
  o.push('</svg>')
  return o.join('')
}
