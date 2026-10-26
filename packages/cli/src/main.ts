import { readFileSync, writeFileSync } from 'node:fs'
import { extname } from 'node:path'
import { Command, CommanderError } from 'commander'
import { svgToPng } from './png'
import { COLOR_NAMES, parseTrace, renderTraceMap, type ColorName, type Panel, type TraceMapSpec } from '@tracemap/core'

const EXAMPLES = `
Examples:
  tracemap render login.trace -o login.svg
  tracemap render login.trace --title "Authentication" --color green --highlight 4-9 -o auth.svg
  tracemap render --spec trace-map.json -o out.svg
  tracemap render login.trace --dark-mode -o login-dark.svg
  tracemap render login.trace --png -o login.png
  tracemap compare old.trace new.trace --right-highlight 2-5 -o fix.svg
  tracemap compare old.trace new.trace --dark-mode --png -o fix.png

A trace file has one step per line, in order, naming a file or a directory (ending
in "/"). Text after " # " is a note. Blank lines and lines starting with "#" are
ignored.

A trace map spec is JSON, for example:
  {"panels": [{"trace": "src/a.ts # start\\nsrc/b.ts", "title": "T", "color": "red", "highlight": [1, 2]}]}

A trace map spec with two panels draws them side by side, like "compare".

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

function parseHighlight(text: string, flag = '--highlight'): [number, number] {
  const m = text.match(/^(\d+)(?:-(\d+))?$/)
  if (!m) throw new CliError(`Malformed ${flag} "${text}": use a step number like 3 or a range like 2-5`)
  const from = Number(m[1])
  const to = m[2] === undefined ? from : Number(m[2])
  if (from < 1 || to < from) throw new CliError(`Malformed ${flag} "${text}": steps are numbered from 1 and a range must go upwards`)
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

function specFromJson(text: string): TraceMapSpec {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (e) {
    throw new CliError(`The spec is not valid JSON: ${(e as Error).message}`)
  }
  const spec = raw as Partial<TraceMapSpec> | null
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
  return spec as TraceMapSpec
}

interface RenderOptions extends OutputOptions {
  title?: string
  color?: string
  highlight?: string
  spec?: string
}

async function render(trace: string | undefined, opts: RenderOptions): Promise<void> {
  let spec: TraceMapSpec
  if (opts.spec !== undefined) {
    if (trace !== undefined || opts.title !== undefined || opts.color !== undefined || opts.highlight !== undefined) {
      throw new CliError('--spec cannot be combined with TRACE, --title, --color or --highlight', 2)
    }
    spec = specFromJson(read(opts.spec, 'spec file'))
  } else {
    if (trace === undefined) throw new CliError('Give exactly one TRACE file (or use --spec)', 2)
    const panel: Panel = { trace: read(trace, 'trace file') }
    if (opts.title !== undefined) panel.title = opts.title
    if (opts.color !== undefined) panel.color = opts.color as ColorName
    if (opts.highlight !== undefined) panel.highlight = parseHighlight(opts.highlight)
    checkPanel(panel, '')
    spec = { panels: [panel] }
  }

  await write(spec, opts)
}

interface OutputOptions {
  darkMode?: boolean
  png?: boolean
  output: string
}

/** Renders the trace map spec and writes it as SVG, or as PNG for --png or a .png output path. */
async function write(spec: TraceMapSpec, opts: OutputOptions): Promise<void> {
  if (opts.darkMode) spec = { ...spec, theme: 'dark' }
  let svg: string
  try {
    svg = renderTraceMap(spec)
  } catch (e) {
    throw new CliError((e as Error).message)
  }
  if (opts.png || extname(opts.output).toLowerCase() === '.png') {
    try {
      writeFileSync(opts.output, await svgToPng(svg))
    } catch (e) {
      throw new CliError((e as Error).message)
    }
    return
  }
  writeFileSync(opts.output, svg + '\n')
}

interface CompareOptions extends OutputOptions {
  leftTitle: string
  leftColor?: string
  leftHighlight?: string
  rightTitle: string
  rightColor?: string
  rightHighlight?: string
}

async function compare(left: string, right: string, opts: CompareOptions): Promise<void> {
  if (left === '-' && right === '-') throw new CliError('Only one of LEFT and RIGHT can read stdin', 2)
  const side = (file: string, name: 'left' | 'right', title: string, color?: string, highlight?: string): Panel => {
    const panel: Panel = { trace: read(file, `${name} trace file`) }
    if (title !== '') panel.title = title
    if (color !== undefined) panel.color = color as ColorName
    if (highlight !== undefined) panel.highlight = parseHighlight(highlight, `--${name}-highlight`)
    checkPanel(panel, name === 'left' ? 'Left: ' : 'Right: ')
    return panel
  }
  await write({
    panels: [
      side(left, 'left', opts.leftTitle, opts.leftColor, opts.leftHighlight),
      side(right, 'right', opts.rightTitle, opts.rightColor, opts.rightHighlight),
    ],
  }, opts)
}

function buildProgram(): Command {
  const program = new Command('tracemap')
    .description('Draw a trace as a trace map (the directory tree with the steps highlighted) as an SVG.')
    .exitOverride()
    .configureOutput({
      writeOut: (s) => process.stdout.write(s),
      writeErr: (s) => process.stderr.write(s),
      outputError: (s, write) => write(`tracemap: ${s.replace(/^error: /, '')}`),
    })
    .addHelpText('after', `${EXAMPLES}\nRun "tracemap render --help" or "tracemap compare --help" for every option.\n`)

  program
    .command('render')
    .description('Render a trace file, or a trace map spec, to an SVG or PNG file.')
    .argument('[trace]', 'trace file, one step per line; "-" reads stdin')
    .option('--title <text>', 'title drawn above the tree')
    .option('--color <color>', `highlight color: ${COLOR_NAMES.join(', ')} (default: blue)`)
    .option('--highlight <N|A-B>', 'steps drawn in color, 1-based: "3" for one step, "2-5" for a range (default: whole trace)')
    .option('--spec <file>', 'read a trace map spec as JSON instead of TRACE and the flags above; "-" reads stdin')
    .option('--dark-mode', 'render the dark theme instead of the light one')
    .option('--png', 'write a PNG instead of an SVG (also chosen by an output path ending in .png); needs a monospace font installed')
    .requiredOption('-o, --output <file>', 'where to write the image')
    .addHelpText('after', EXAMPLES)
    .action(render)

  const colors = `${COLOR_NAMES.join(', ')} (default: blue, the same on both sides)`
  const steps = '1-based: "3" for one step, "2-5" for a range (default: whole trace)'
  program
    .command('compare')
    .description('Render two trace files side by side on the same tree, typically before and after a change.')
    .argument('<left>', 'trace file drawn on the left; "-" reads stdin')
    .argument('<right>', 'trace file drawn on the right; "-" reads stdin')
    .option('--left-title <text>', 'title above the left panel; "" for none', 'before')
    .option('--left-color <color>', `left highlight color: ${colors}`)
    .option('--left-highlight <N|A-B>', `left steps drawn in color, ${steps}`)
    .option('--right-title <text>', 'title above the right panel; "" for none', 'after')
    .option('--right-color <color>', `right highlight color: ${colors}`)
    .option('--right-highlight <N|A-B>', `right steps drawn in color, ${steps}`)
    .option('--dark-mode', 'render the dark theme instead of the light one')
    .option('--png', 'write a PNG instead of an SVG (also chosen by an output path ending in .png); needs a monospace font installed')
    .requiredOption('-o, --output <file>', 'where to write the image')
    .addHelpText('after', EXAMPLES)
    .action(compare)

  return program
}

/** Runs the command and returns the exit code. */
export async function main(argv: string[]): Promise<number> {
  const program = buildProgram()
  if (argv.length === 0) {
    program.outputHelp()
    return 2
  }
  try {
    await program.parseAsync(argv, { from: 'user' })
    return 0
  } catch (e) {
    if (e instanceof CliError) {
      process.stderr.write(`tracemap: ${e.message}\n`)
      return e.code
    }
    // Commander has already printed its own message; usage errors are 2, --help is 0.
    if (e instanceof CommanderError) return e.exitCode === 0 ? 0 : 2
    throw e
  }
}
