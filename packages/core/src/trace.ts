export interface Step {
  path: string
  isDir: boolean
  note: string
}

export interface Row {
  name: string
  path: string
  children: Map<string, Row>
  isDir: boolean
  depth: number
  row: number
  parent: Row | null
  last: number
  lastChild?: number
}

const ROW = 28, IND = 16, PADL = 34, PADT = 18, CW = 7.8

export const EXAMPLE = `# Trace: POST /login with a valid password (integration test)
# One path per line, in execution order. Text after " # " is an optional note.
tests/integration/test_login.py      # Test sends POST /login with valid credentials
src/app/main.py                      # App receives the request, middleware chain starts
src/app/middleware/rate_limit.py     # Request counted against the per-IP limit
src/app/routes/auth.py               # Route handler login() is selected
src/app/schemas/auth.py              # Request body validated as LoginRequest
src/app/services/auth_service.py     # authenticate() takes over
src/app/models/user.py               # User lookup by email
src/app/db/session.py                # Database session opened
src/app/models/user.py               # Row mapped to a User object
src/app/security/passwords.py        # Password hash verified
src/app/config/settings.py           # Token lifetime read from settings
src/app/security/tokens.py           # Access token signed
src/app/services/auth_service.py     # Result returned to the route
src/app/routes/auth.py               # 200 response built with the token
src/app/middleware/                  # Response headers added on the way out
tests/integration/test_login.py      # Test asserts status 200 and a valid token
`

export function parseTrace(text: string): Step[] {
  const steps: Step[] = []
  for (const line of text.split(/\r?\n/)) {
    let s = line.trim()
    if (!s || s[0] === '#') continue
    let note = ''
    const m = s.match(/^(.*?)\s+#\s*(.*)$/)
    if (m) { s = m[1].trim(); note = m[2].trim() }
    s = s.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/{2,}/g, '/')
    const isDir = s.endsWith('/')
    s = s.replace(/^\/+|\/+$/g, '')
    if (!s) continue
    steps.push({ path: s, isDir, note })
  }
  return steps
}

export function buildTree(steps: Step[]): Row[] {
  const root: Row = { name: '', path: '', children: new Map(), isDir: true, depth: -1, row: -1, parent: null, last: -1 }
  for (const st of steps) {
    const parts = st.path.split('/')
    let node = root
    parts.forEach((p, i) => {
      let c = node.children.get(p)
      if (!c) {
        c = { name: p, path: parts.slice(0, i + 1).join('/'), children: new Map(), isDir: false, depth: 0, row: 0, parent: null, last: 0 }
        node.children.set(p, c)
      }
      if (i < parts.length - 1 || st.isDir) c.isDir = true
      node = c
    })
  }
  const rows: Row[] = []
  const walk = (n: Row, d: number) => {
    const kids = [...n.children.values()].sort((a, b) => (Number(b.isDir) - Number(a.isDir)) || a.name.localeCompare(b.name))
    for (const k of kids) {
      k.depth = d; k.row = rows.length; k.parent = n === root ? null : n; rows.push(k)
      walk(k, d + 1)
      k.last = rows.length - 1
    }
    if (n !== root && kids.length) n.lastChild = kids[kids.length - 1].row
  }
  walk(root, 0)
  return rows
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const px = (n: number) => Math.round(n * 10) / 10

export function renderSvg(steps: Step[], rows: Row[], cur: number, trail: number, showAll: boolean): string {
  const byPath = new Map(rows.map((r) => [r.path, r]))
  const X = (r: Row) => PADL + r.depth * IND
  const Y = (r: Row) => PADT + r.row * ROW + ROW / 2
  let maxR = 0
  for (const r of rows) maxR = Math.max(maxR, X(r) + 12 + (r.name.length + (r.isDir ? 1 : 0)) * CW)
  const W = Math.ceil(maxR + 100)
  const H = PADT * 2 + rows.length * ROW
  const lo = Math.max(0, cur - trail)

  // age per node (most recent visit in window) and the step numbers shown as chips
  const age = new Map<Row, number>(), nums = new Map<Row, number[]>()
  for (let k = lo; k <= cur; k++) {
    const r = byPath.get(steps[k].path)!
    const a = cur - k
    if (!age.has(r) || a < age.get(r)!) age.set(r, a)
    if (!nums.has(r)) nums.set(r, [])
    nums.get(r)!.push(k + 1)
  }
  const fade = (a: number) => Math.max(0.28, 1 - a / (trail + 1))
  const curRow = byPath.get(steps[cur].path)!
  const o: string[] = []
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace" font-size="13" role="img" aria-label="Trace through the directory tree, step ${cur + 1} of ${steps.length}">`)
  o.push(`<rect width="${W}" height="${H}" style="fill:var(--panel)"/>`)

  // row highlights
  for (const r of rows) {
    if (!age.has(r)) continue
    const isNow = r === curRow
    o.push(`<rect x="${PADL - 8 + r.depth * IND - 6}" y="${PADT + r.row * ROW + 2}" width="${W - (PADL + r.depth * IND - 14) - 8}" height="${ROW - 4}" rx="4" style="fill:var(${isNow ? '--now' : '--trail'})" opacity="${isNow ? 0.16 : px(0.13 * fade(age.get(r)!))}"/>`)
  }
  // tree guides: a vertical rail per directory, an elbow to each child
  const RX = PADL - IND
  const tops = rows.filter((r) => r.depth === 0)
  let gd = ''
  if (tops.length) gd += `M${RX} ${Y(tops[0])}V${Y(tops[tops.length - 1])}`
  for (const r of rows) {
    const lx0 = r.parent ? X(r.parent) : RX
    gd += `M${lx0} ${Y(r)}H${X(r)}`
    if (r.isDir && r.lastChild !== undefined) gd += `M${X(r)} ${Y(r)}V${PADT + r.lastChild * ROW + ROW / 2}`
  }
  o.push(`<path d="${gd}" fill="none" style="stroke:var(--line)" stroke-width="1.2"/>`)

  // The trace runs along the tree's own rails: up from a to the common ancestor, then down to b.
  const seg = (a: Row, b: Row): string => {
    if (a === b) return ''
    const anc = (n: Row) => { const c: Row[] = []; for (let m: Row | null = n; m; m = m.parent) c.push(m); return c }
    const cb = anc(b)
    let L: Row | null = null
    for (const m of anc(a)) if (cb.includes(m)) { L = m; break }
    const xL = L ? X(L) : RX
    const P: [number, number][] = [[X(a), Y(a)]]
    let n = a
    if (n !== L) {
      while (n.parent !== L) { P.push([X(n) - IND, Y(n)], [X(n) - IND, Y(n.parent!)]); n = n.parent! }
      P.push([xL, Y(n)])
    }
    const down: Row[] = []
    for (let m: Row | null = b; m !== L; m = m!.parent) down.unshift(m!)
    if (!down.length) P.push([xL, Y(L!)])
    else {
      P.push([xL, Y(down[0])])
      down.forEach((m, i) => { P.push([X(m), Y(m)]); if (i + 1 < down.length) P.push([X(m), Y(down[i + 1])]) })
    }
    const Q = P.filter((p, i) => i === 0 || p[0] !== P[i - 1][0] || p[1] !== P[i - 1][1])
    return 'M' + Q.map((p) => px(p[0]) + ' ' + px(p[1])).join('L')
  }

  // full route, faint
  if (showAll) {
    let d = ''
    for (let k = 1; k < steps.length; k++) d += seg(byPath.get(steps[k - 1].path)!, byPath.get(steps[k].path)!)
    o.push(`<path d="${d}" fill="none" style="stroke:var(--faint)" stroke-width="2.5" stroke-linejoin="round" opacity="0.55"/>`)
  }
  // trail segments, oldest first
  for (let k = lo + 1; k <= cur; k++) {
    const d = seg(byPath.get(steps[k - 1].path)!, byPath.get(steps[k].path)!)
    if (!d) continue
    const a = cur - k
    const isNow = a === 0
    o.push(`<path d="${d}" fill="none" style="stroke:var(${isNow ? '--now' : '--trail'})" stroke-width="${isNow ? 3.5 : 2.8}" stroke-linecap="round" stroke-linejoin="round" opacity="${px(isNow ? 1 : fade(a))}"/>`)
  }

  // dots, labels, chips
  for (const r of rows) {
    const x = X(r), y = Y(r)
    const inWin = age.has(r), isNow = r === curRow
    if (isNow) {
      o.push(`<circle cx="${x}" cy="${y}" r="6.5" style="fill:var(--now);stroke:var(--panel)" stroke-width="2"/>`)
    } else if (inWin) {
      o.push(`<circle cx="${x}" cy="${y}" r="4.5" style="fill:var(--trail);stroke:var(--panel)" stroke-width="1.5" opacity="${px(fade(age.get(r)!))}"/>`)
    } else {
      o.push(`<circle cx="${x}" cy="${y}" r="3" style="fill:var(--panel);stroke:var(--faint)" stroke-width="1.2"/>`)
    }
    const lx = x + 11
    const name = esc(r.name) + (r.isDir ? '/' : '')
    const wt = isNow ? 600 : r.isDir ? 600 : 400
    o.push(`<text x="${lx}" y="${y + 4.5}" style="fill:var(${inWin ? '--ink' : '--muted'})" font-weight="${wt}" opacity="${inWin && !isNow ? px(Math.max(0.6, fade(age.get(r)!))) : 1}">${name}</text>`)
    if (inWin) {
      const txt = nums.get(r)!.join(' · ')
      const tw = txt.length * 6.6 + 12
      const cxp = lx + (r.name.length + (r.isDir ? 1 : 0)) * CW + 8
      o.push(`<rect x="${px(cxp)}" y="${y - 8}" width="${px(tw)}" height="16" rx="8" style="fill:var(${isNow ? '--now' : '--trail'})" opacity="${isNow ? 1 : px(fade(age.get(r)!))}"/>`)
      o.push(`<text x="${px(cxp + tw / 2)}" y="${y + 3.8}" text-anchor="middle" font-size="11" font-weight="600" style="fill:var(--panel)">${txt}</text>`)
    }
  }
  o.push('</svg>')
  return o.join('')
}

export interface RenderOptions {
  /** Zero-based index of the current step. Clamped to the trace. */
  step?: number
  /** How many earlier steps stay visible behind the current one. */
  trail?: number
  /** Draw the whole route faintly behind the trail. */
  showAll?: boolean
}

/** Trace file text in, SVG text out: the public seam the golden tests run through. */
export function renderTrace(text: string, { step = 0, trail = 3, showAll = true }: RenderOptions = {}): string {
  const steps = parseTrace(text)
  if (!steps.length) return ''
  const last = steps.length - 1
  const cur = Math.min(Math.max(step, 0), last)
  return renderSvg(steps, buildTree(steps), cur, Math.min(trail, Math.max(1, last)), showAll)
}
