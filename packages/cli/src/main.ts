import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { COLOR_NAMES, parseTrace, renderTrail, type ColorName, type Panel, type TrailSpec } from '@tracetrail/core'

const HELP = `tracetrail render: draw the route a trace takes through a directory tree as an SVG.

Usage:
  tracetrail render TRACE [--title T] [--color C] [--highlight N|A-B] -o out.svg
  tracetrail render --spec trail.json -o out.svg

TRACE is a trace file: one step per line, in order, naming a file or a directory
(ending in "/"). Text after " # " is a note. Blank lines and lines starting with
"#" are ignored. Use "-" to read the trace from stdin.

Options:
  --title T          Title drawn above the tree.
  --color C          Highlight color: ${COLOR_NAMES.join(', ')}. Default: blue.
  --highlight N|A-B  The steps drawn in color, as 1-based step numbers: "3" for one
                     step, "2-5" for steps 2 to 5. Default: the whole trace.
  --spec FILE        Read a trail spec as JSON instead of using TRACE and the flags
                     above. Use "-" to read it from stdin.
  -o, --output FILE  Where to write the SVG. Required.
  -h, --help         Show this help.

Examples:
  tracetrail render login.trace -o login.svg
  tracetrail render login.trace --title "Authentication" --color green --highlight 4-9 -o auth.svg
  tracetrail render --spec trail.json -o out.svg

A trail spec is JSON, for example:
  {"panels": [{"trace": "src/a.ts # start\\nsrc/b.ts", "title": "T", "color": "red", "highlight": [1, 2]}]}

Exit codes: 0 on success, 1 on invalid input or a failed render, 2 on a usage error.
`

class CliError extends Error {
  constructor(message: string, readonly code = 1) {
    super(message)
  }
}

const read = (file: string, what: string): string => {
  try {
    return readFileSync(file === '-' ? 0 : file, 'utf8')
  } catch {
    throw new CliError(`Cannot read ${what} "${file}"`)
  }
}

const isColor = (c: unknown): c is ColorName => (COLOR_NAMES as readonly unknown[]).includes(c)

function parseHighlight(text: string): [number, number] {
  const m = text.match(/^(\d+)(?:-(\d+))?$/)
  if (!m) throw new CliError(`Malformed --highlight "${text}": use a step number like 3 or a range like 2-5`)
  const from = Number(m[1])
  const to = m[2] === undefined ? from : Number(m[2])
  if (from < 1 || to < from) throw new CliError(`Malformed --highlight "${text}": steps are numbered from 1 and a range must go upwards`)
  return [from, to]
}

/** Checks one panel the way the flags would be checked, so --spec gets the same messages. */
function checkPanel(panel: Panel, where: string): void {
  if (panel.color !== undefined && !isColor(panel.color)) {
    throw new CliError(`${where}Unknown color "${panel.color}": use one of ${COLOR_NAMES.join(', ')}`)
  }
  const steps = parseTrace(panel.trace).length
  if (steps === 0) throw new CliError(`${where}The trace has no steps`)
  if (panel.highlight) {
    const [from, to] = panel.highlight
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
      throw new CliError(`${where}Malformed highlight [${from}, ${to}]: steps are numbered from 1 and a range must go upwards`)
    }
    if (to > steps) throw new CliError(`${where}Highlight ${from}-${to} is out of range: the trace has ${steps} step${steps === 1 ? '' : 's'}`)
  }
}

function specFromJson(text: string): TrailSpec {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (e) {
    throw new CliError(`The spec is not valid JSON: ${(e as Error).message}`)
  }
  const spec = raw as Partial<TrailSpec> | null
  if (!spec || !Array.isArray(spec.panels) || spec.panels.length < 1 || spec.panels.length > 2) {
    throw new CliError('The spec needs "panels": a list of one or two panels')
  }
  spec.panels.forEach((p, i) => {
    if (!p || typeof p.trace !== 'string') throw new CliError(`Panel ${i + 1}: "trace" must be the trace file text`)
    if (p.highlight !== undefined && (!Array.isArray(p.highlight) || p.highlight.length !== 2)) {
      throw new CliError(`Panel ${i + 1}: "highlight" must be [from, to]`)
    }
    checkPanel(p, spec.panels!.length > 1 ? `Panel ${i + 1}: ` : '')
  })
  return spec as TrailSpec
}

function render(args: string[]): void {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      title: { type: 'string' },
      color: { type: 'string' },
      highlight: { type: 'string' },
      spec: { type: 'string' },
      output: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h' },
    },
  })
  if (values.help) {
    process.stdout.write(HELP)
    return
  }
  if (!values.output) throw new CliError('Missing -o/--output: say where to write the SVG', 2)

  let spec: TrailSpec
  if (values.spec !== undefined) {
    if (positionals.length || values.title !== undefined || values.color !== undefined || values.highlight !== undefined) {
      throw new CliError('--spec cannot be combined with TRACE, --title, --color or --highlight', 2)
    }
    spec = specFromJson(read(values.spec, 'spec file'))
  } else {
    if (positionals.length !== 1) throw new CliError('Give exactly one TRACE file (or use --spec)', 2)
    const panel: Panel = { trace: read(positionals[0], 'trace file') }
    if (values.title !== undefined) panel.title = values.title
    if (values.color !== undefined) panel.color = values.color as ColorName
    if (values.highlight !== undefined) panel.highlight = parseHighlight(values.highlight)
    checkPanel(panel, '')
    spec = { panels: [panel] }
  }

  let svg: string
  try {
    svg = renderTrail(spec)
  } catch (e) {
    throw new CliError((e as Error).message)
  }
  writeFileSync(values.output, svg + '\n')
}

/** Runs the command and returns the exit code. */
export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv
  try {
    if (!command || command === '--help' || command === '-h' || command === 'help') {
      process.stdout.write(HELP)
      return command ? 0 : 2
    }
    if (command !== 'render') throw new CliError(`Unknown command "${command}": the only command is render (see --help)`, 2)
    render(rest)
    return 0
  } catch (e) {
    if (e instanceof CliError) {
      process.stderr.write(`tracetrail: ${e.message}\n`)
      return e.code
    }
    if ((e as { code?: string }).code?.startsWith('ERR_PARSE_ARGS')) {
      process.stderr.write(`tracetrail: ${(e as Error).message} (see --help)\n`)
      return 2
    }
    throw e
  }
}
