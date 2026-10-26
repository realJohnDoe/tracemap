import { useEffect, useMemo, useRef, useState } from 'react'
import { COLOR_NAMES, ShareError, cliCommand, decodeShareFragment, encodeShareFragment, normalizeSpec, parseTrace, renderTrail, type ColorName, type Panel, type Theme, type TrailSpec } from '@tracetrail/core'
import { COMPARE_EXAMPLE, SINGLE_EXAMPLE, SINGLE_HIGHLIGHT } from './examples'
import { download, serializeSvg, svgToPngBlob } from './lib/export'

const btn = 'cursor-pointer rounded-md border border-line bg-panel px-3 py-[5px] text-[13px] text-ink hover:border-trail'
const lbl = 'flex justify-between text-[11px] uppercase tracking-[0.08em] text-muted'
const val = 'font-mono text-[13px] font-semibold normal-case tracking-normal text-ink'
const field = 'rounded-md border border-line bg-bg px-2 py-[5px] text-[13px] text-ink'
const area = 'w-full resize-y whitespace-pre overflow-auto rounded-md border border-line bg-bg p-2.5 font-mono text-xs leading-normal text-ink'

/** One panel's controls in Compare mode; a null highlight means the whole trace. */
interface Side {
  trace: string
  title: string
  color: ColorName
  highlight: [number, number] | null
}

// Same defaults as `tracetrail compare`: titled before and after, both sides in the same color.
const SIDES: [Side, Side] = [
  { trace: COMPARE_EXAMPLE.before, title: 'before', color: 'blue', highlight: COMPARE_EXAMPLE.beforeHighlight },
  { trace: COMPARE_EXAMPLE.after, title: 'after', color: 'blue', highlight: COMPARE_EXAMPLE.afterHighlight },
]

const toSide = (p: Panel): Side => ({ trace: p.trace, title: p.title ?? '', color: p.color ?? 'blue', highlight: p.highlight ?? null })

const toPanel = (s: Side): Panel => ({ trace: s.trace, title: s.title || undefined, color: s.color, highlight: s.highlight ?? undefined })

function SideControls({ name, side, onChange }: { name: 'Left' | 'Right'; side: Side; onChange: (s: Side) => void }) {
  const n = useMemo(() => parseTrace(side.trace).length, [side.trace])
  const clamp = (k: number) => Math.min(Math.max(k, 1), Math.max(n, 1))
  const from = side.highlight ? clamp(side.highlight[0]) : 1
  const to = side.highlight ? clamp(side.highlight[1]) : Math.max(n, 1)
  const id = name.toLowerCase()
  const set = (patch: Partial<Side>) => onChange({ ...side, ...patch })

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 rounded-lg border border-line bg-panel px-4 py-3.5">
      <legend className="px-1 font-medium">{name}</legend>
      <label htmlFor={`${id}-title`} className={lbl}>Title</label>
      <input id={`${id}-title`} type="text" className={field} placeholder="Optional, drawn above the panel"
        value={side.title} onChange={(e) => set({ title: e.target.value })} />
      <label htmlFor={`${id}-color`} className={lbl}>Color</label>
      <select id={`${id}-color`} className={field} value={side.color} onChange={(e) => set({ color: e.target.value as ColorName })}>
        {COLOR_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <label htmlFor={`${id}-from`} className={lbl}>
        Highlight from <b className={val}>{n ? `${from} / ${n}` : '0 / 0'}</b>
      </label>
      <input id={`${id}-from`} type="range" min={1} max={Math.max(1, n)} value={from}
        onChange={(e) => { const k = Number(e.target.value); set({ highlight: [k, Math.max(k, to)] }) }} />
      <label htmlFor={`${id}-to`} className={lbl}>
        Highlight to <b className={val}>{n ? `${to} / ${n}` : '0 / 0'}</b>
      </label>
      <input id={`${id}-to`} type="range" min={1} max={Math.max(1, n)} value={to}
        onChange={(e) => { const k = Number(e.target.value); set({ highlight: [Math.min(from, k), k] }) }} />
      <div className="flex flex-wrap items-center gap-2">
        <button className={btn} onClick={() => set({ highlight: null })}>Whole trace</button>
      </div>
      <label htmlFor={`${id}-trace`} className={lbl}>Trace</label>
      <textarea id={`${id}-trace`} className={`${area} min-h-[180px]`} spellCheck={false}
        value={side.trace} onChange={(e) => set({ trace: e.target.value })} />
    </fieldset>
  )
}

export default function App() {
  const [mode, setMode] = useState<'single' | 'compare'>('single')
  const [sides, setSides] = useState<[Side, Side]>(SIDES)
  const [text, setText] = useState(SINGLE_EXAMPLE)
  // Trail spec fields; a null highlight means the whole trace.
  const [highlight, setHighlight] = useState<[number, number] | null>(SINGLE_HIGHLIGHT)
  const [color, setColor] = useState<ColorName>('blue')
  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState<Theme>('light')
  const [playing, setPlaying] = useState(false)
  const [status, setStatus] = useState('')
  const [svgSource, setSvgSource] = useState<string | null>(null)
  const [shareError, setShareError] = useState('')
  // The address is only rewritten once an incoming share link has been read, so opening one never loses it.
  const [linkRead, setLinkRead] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const steps = useMemo(() => parseTrace(text), [text])
  const n = steps.length
  const clamp = (k: number) => Math.min(Math.max(k, 1), Math.max(n, 1))
  const from = highlight ? clamp(highlight[0]) : 1
  const to = highlight ? clamp(highlight[1]) : Math.max(n, 1)

  const spec: TrailSpec = useMemo(
    () => mode === 'compare'
      ? { panels: [toPanel(sides[0]), toPanel(sides[1])], theme }
      : { panels: [{ trace: text, title: title || undefined, color, highlight: highlight ?? undefined }], theme },
    [mode, sides, text, title, color, highlight, theme],
  )
  const svg = useMemo(() => renderTrail(spec), [spec])

  const applySpec = (next: TrailSpec) => {
    setPlaying(false)
    setTheme(next.theme ?? 'light')
    if (next.panels.length === 2) {
      setMode('compare')
      setSides([toSide(next.panels[0]), toSide(next.panels[1])])
    } else {
      const side = toSide(next.panels[0])
      setMode('single')
      setText(side.trace); setTitle(side.title); setColor(side.color); setHighlight(side.highlight)
    }
  }

  // Opening a share link restores its view; a link that cannot be read leaves the example in place.
  useEffect(() => {
    let current = true
    const open = async () => {
      if (!location.hash.startsWith('#t=')) return setLinkRead(true)
      try {
        const next = await decodeShareFragment(location.hash)
        if (!current) return
        applySpec(next)
        setShareError('')
      } catch (e) {
        if (!current) return
        setShareError(`${e instanceof ShareError ? e.message : 'The link could not be read.'} Showing the example instead.`)
      }
      setLinkRead(true)
    }
    open()
    const onHash = () => { if (location.hash.startsWith('#t=')) setLinkRead(false), open() }
    window.addEventListener('hashchange', onHash)
    return () => { current = false; window.removeEventListener('hashchange', onHash) }
  }, [])

  // Keep the address in step with the view so the page URL is always a share link.
  useEffect(() => {
    if (!linkRead || !svg) return
    let current = true
    encodeShareFragment(spec).then((f) => {
      if (current && location.hash.slice(1) !== f) history.replaceState(null, '', '#' + f)
    })
    return () => { current = false }
  }, [linkRead, spec, svg])

  // Play advances a one-step highlight through the trace.
  useEffect(() => {
    if (!playing) return
    if (from >= n) { setPlaying(false); return }
    const t = setTimeout(() => setHighlight([from + 1, from + 1]), 900)
    return () => clearTimeout(t)
  }, [playing, from, n])

  const goStep = (k: number) => { setPlaying(false); setHighlight([clamp(k), clamp(k)]) }
  const setFrom = (k: number) => { setPlaying(false); setHighlight([k, Math.max(k, to)]) }
  const setTo = (k: number) => { setPlaying(false); setHighlight([Math.min(from, k), k]) }
  const single = from === to

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLInputElement
      if (mode !== 'single') return
      if (/^(TEXTAREA|INPUT|SELECT)$/.test(t.tagName) && t.type !== 'range') return
      if (e.key === 'ArrowLeft') goStep(single ? from - 1 : from)
      else if (e.key === 'ArrowRight') goStep(single ? from + 1 : from)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const togglePlay = () => {
    if (playing) return setPlaying(false)
    setHighlight(from >= n ? [1, 1] : [from, from])
    setPlaying(true)
  }

  const loadText = (t: string) => { setPlaying(false); setText(t); setHighlight(null) }
  const getSvg = () => {
    const el = panelRef.current?.querySelector('svg')
    return el ? { el, source: serializeSvg(el) } : null
  }

  const copySvg = async () => {
    const s = getSvg()
    if (!s) return
    try {
      await navigator.clipboard.writeText(s.source)
      setSvgSource(null)
      setStatus('SVG copied to the clipboard.')
    } catch {
      setSvgSource(s.source)
      setStatus('Clipboard is blocked here. The SVG source is shown below, copy it manually.')
    }
  }
  const saveSvg = () => {
    const s = getSvg()
    if (!s) return
    download('trail.svg', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.source))
    setStatus('Export started. If nothing downloads, use Copy SVG instead.')
  }
  const savePng = async () => {
    const s = getSvg()
    if (!s) return
    try {
      const blob = await svgToPngBlob(s.el, s.source)
      const url = URL.createObjectURL(blob)
      download('trail.png', url)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatus('Export started. If nothing downloads, use Copy SVG instead.')
    } catch {
      setStatus('PNG export failed. Use Copy SVG instead.')
    }
  }

  const copyLink = async () => {
    const fragment = await encodeShareFragment(spec)
    const url = location.origin + location.pathname + location.search + '#' + fragment
    try {
      await navigator.clipboard.writeText(url)
      setSvgSource(null)
      setStatus('Share link copied to the clipboard.')
    } catch {
      setSvgSource(url)
      setStatus('Clipboard is blocked here. The share link is shown below, copy it manually.')
    }
  }
  const copyCommand = async () => {
    const command = cliCommand(spec)
    try {
      await navigator.clipboard.writeText(command)
      setSvgSource(null)
      setStatus(`CLI command copied. Run it on ${spec.panels.length === 1 ? 'trace.trace' : 'left.trace and right.trace'}; use Download trace files to get them.`)
    } catch {
      setSvgSource(command)
      setStatus('Clipboard is blocked here. The command is shown below, copy it manually.')
    }
  }
  const downloadText = (name: string, type: string, text: string) => {
    download(name, `data:${type};charset=utf-8,` + encodeURIComponent(text))
    setStatus(`Export of ${name} started.`)
  }
  const saveSpec = () => downloadText('trail.json', 'application/json', JSON.stringify(normalizeSpec(spec), null, 2) + '\n')
  const saveTraces = () => {
    const names = spec.panels.length === 1 ? ['trace.trace'] : ['left.trace', 'right.trace']
    spec.panels.forEach((p, i) => setTimeout(() => downloadText(names[i], 'text/plain', p.trace), i * 200))
  }

  const s = single ? steps[from - 1] : undefined
  const switchMode = (m: 'single' | 'compare') => { setPlaying(false); setMode(m) }
  const modeBtn = (m: 'single' | 'compare', name: string) => (
    <button className={`${btn} ${mode === m ? '!border-trail font-medium' : ''}`} aria-pressed={mode === m}
      onClick={() => switchMode(m)}>{name}</button>
  )

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="m-0 text-[22px] font-semibold tracking-tight text-balance">Trace Trail</h1>
        <p className="m-0 max-w-[65ch] text-muted">
          Draws a trace through the directory tree. Pick the highlight, the steps drawn in color; everything else stays neutral grey.
          Compare draws two traces side by side on the same tree, typically before and after a change.
        </p>
        <div className="mt-1 flex gap-2" role="group" aria-label="Mode">
          {modeBtn('single', 'Single trace')}
          {modeBtn('compare', 'Compare')}
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-[13px] text-ink">
            <input type="checkbox" checked={theme === 'dark'} onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')} />
            Dark theme
          </label>
        </div>
      </header>

      {shareError && <p role="alert" className="m-0 rounded-lg border border-line bg-panel px-4 py-2.5 text-[13px] text-now">{shareError}</p>}

      {mode === 'compare' ? (
        <section aria-label="Trail spec" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SideControls name="Left" side={sides[0]} onChange={(l) => setSides([l, sides[1]])} />
          <SideControls name="Right" side={sides[1]} onChange={(r) => setSides([sides[0], r])} />
        </section>
      ) : (<>
      <section aria-label="Trail spec" className="grid grid-cols-1 gap-x-6 gap-y-3.5 rounded-lg border border-line bg-panel px-4 py-3.5 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="from" className={lbl}>
            Highlight from <b className={val}>{n ? `${from} / ${n}` : '0 / 0'}</b>
          </label>
          <input id="from" type="range" min={1} max={Math.max(1, n)} value={from}
            onChange={(e) => setFrom(Number(e.target.value))} />
          <label htmlFor="to" className={lbl}>
            Highlight to <b className={val}>{n ? `${to} / ${n}` : '0 / 0'}</b>
          </label>
          <input id="to" type="range" min={1} max={Math.max(1, n)} value={to}
            onChange={(e) => setTo(Number(e.target.value))} />
          <div className="flex flex-wrap items-center gap-2">
            <button className={btn} aria-label="Previous step" onClick={() => goStep(single ? from - 1 : from)}>◀</button>
            <button className={`${btn} !border-trail !bg-trail font-medium !text-bg`} onClick={togglePlay}>
              {playing ? 'Pause' : 'Play'}
            </button>
            <button className={btn} aria-label="Next step" onClick={() => goStep(single ? from + 1 : from)}>▶</button>
            <button className={btn} onClick={() => { setPlaying(false); setHighlight(null) }}>Whole trace</button>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="color" className={lbl}>Color</label>
          <select id="color" className={field} value={color} onChange={(e) => setColor(e.target.value as ColorName)}>
            {COLOR_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label htmlFor="title" className={lbl}>Title</label>
          <input id="title" type="text" className={field} placeholder="Optional, drawn above the tree"
            value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </section>

      <div className="flex min-h-[3.2em] flex-col gap-0.5 px-0.5" aria-live="polite">
        {s ? (
          <>
            <div className="break-words font-mono text-[13px] font-semibold">
              <span className="text-muted">Step {from}  </span>
              {s.path + (s.isDir ? '/' : '')}
            </div>
            <div className="text-muted">{s.note || ' '}</div>
          </>
        ) : n > 0 && (
          <div className="font-mono text-[13px] font-semibold">
            Steps {from} to {to} of {n} highlighted
          </div>
        )}
      </div>

      </>)}

      <div ref={panelRef} className="overflow-x-auto rounded-lg border border-line bg-panel [&_svg]:block">
        {svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <p className="m-0 p-4 text-[13px] text-now">No paths found. Put one file or directory path on each line.</p>
        )}
      </div>

      <details className="rounded-lg border border-line bg-panel px-4 py-2.5">
        <summary className="cursor-pointer font-medium">{mode === 'single' ? 'Trace input, export and share' : 'Export and share'}</summary>
        <div className="mt-2.5 flex flex-col gap-2.5">
          {mode === 'single' && (<>
          <p className="m-0 max-w-[70ch] text-xs text-muted">
            One file or directory path per line, in the order it was visited. A trailing slash marks a directory.
            Text after <code>#</code> on a line becomes the note for that step. Lines that start with <code>#</code> are ignored.
          </p>
          <textarea className={`${area} min-h-[220px]`} spellCheck={false} aria-label="Trace input"
            value={text} onChange={(e) => { setPlaying(false); setText(e.target.value) }} />
          <div className="flex flex-wrap items-center gap-2">
            <label className={btn} htmlFor="file">Load .txt file</label>
            <input id="file" type="file" accept=".txt,text/plain" hidden onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              f.text().then(loadText)
              e.target.value = ''
            }} />
            <button className={btn} onClick={() => { loadText(SINGLE_EXAMPLE); setHighlight(SINGLE_HIGHLIGHT) }}>Reset example</button>
          </div>
          </>)}
          <div className="flex flex-wrap items-center gap-2">
            <button className={btn} onClick={copySvg}>Copy SVG</button>
            <button className={btn} onClick={savePng}>Download PNG</button>
            <button className={btn} onClick={saveSvg}>Download SVG</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className={btn} onClick={copyLink}>Copy share link</button>
            <button className={btn} onClick={copyCommand}>Copy CLI command</button>
            <button className={btn} onClick={saveSpec}>Download trail spec</button>
            <button className={btn} onClick={saveTraces}>Download trace files</button>
          </div>
          <div className="min-h-[1.4em] text-xs text-muted" role="status">{status}</div>
          {svgSource && (
            <textarea className={`${area} min-h-[120px]`} aria-label="Text to copy" readOnly value={svgSource}
              onFocus={(e) => e.currentTarget.select()} />
          )}
        </div>
      </details>
    </div>
  )
}
