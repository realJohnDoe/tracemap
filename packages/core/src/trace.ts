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
