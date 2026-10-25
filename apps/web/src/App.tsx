import { useEffect, useMemo, useRef, useState } from 'react'
import { COLOR_NAMES, EXAMPLE, parseTrace, renderTrail, type ColorName, type TrailSpec } from '@tracetrail/core'
import { download, serializeSvg, svgToPngBlob } from './lib/export'

const btn = 'cursor-pointer rounded-md border border-line bg-panel px-3 py-[5px] text-[13px] text-ink hover:border-trail'
const lbl = 'flex justify-between text-[11px] uppercase tracking-[0.08em] text-muted'
const val = 'font-mono text-[13px] font-semibold normal-case tracking-normal text-ink'
const field = 'rounded-md border border-line bg-bg px-2 py-[5px] text-[13px] text-ink'
const area = 'w-full resize-y whitespace-pre overflow-auto rounded-md border border-line bg-bg p-2.5 font-mono text-xs leading-normal text-ink'

export default function App() {
  const [text, setText] = useState(EXAMPLE)
  // Trail spec fields; a null highlight means the whole trace.
  const [highlight, setHighlight] = useState<[number, number] | null>(null)
  const [color, setColor] = useState<ColorName>('blue')
  const [title, setTitle] = useState('')
  const [playing, setPlaying] = useState(false)
  const [status, setStatus] = useState('')
  const [svgSource, setSvgSource] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const steps = useMemo(() => parseTrace(text), [text])
  const n = steps.length
  const clamp = (k: number) => Math.min(Math.max(k, 1), Math.max(n, 1))
  const from = highlight ? clamp(highlight[0]) : 1
  const to = highlight ? clamp(highlight[1]) : Math.max(n, 1)

  const spec: TrailSpec = useMemo(
    () => ({ panels: [{ trace: text, title: title || undefined, color, highlight: highlight ?? undefined }] }),
    [text, title, color, highlight],
  )
  const svg = useMemo(() => renderTrail(spec), [spec])

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

  const s = single ? steps[from - 1] : undefined

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="m-0 text-[22px] font-semibold tracking-tight text-balance">Trace Trail</h1>
        <p className="m-0 max-w-[65ch] text-muted">
          Draws a trace through the directory tree. Pick the highlight, the steps drawn in color; everything else stays neutral grey.
        </p>
      </header>

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

      <div ref={panelRef} className="overflow-x-auto rounded-lg border border-line bg-panel [&_svg]:block">
        {n ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <p className="m-0 p-4 text-[13px] text-now">No paths found. Put one file or directory path on each line.</p>
        )}
      </div>

      <details className="rounded-lg border border-line bg-panel px-4 py-2.5">
        <summary className="cursor-pointer font-medium">Trace input and export</summary>
        <div className="mt-2.5 flex flex-col gap-2.5">
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
            <button className={btn} onClick={() => loadText(EXAMPLE)}>Reset example</button>
            <button className={btn} onClick={copySvg}>Copy SVG</button>
            <button className={btn} onClick={savePng}>Download PNG</button>
            <button className={btn} onClick={saveSvg}>Download SVG</button>
          </div>
          <div className="min-h-[1.4em] text-xs text-muted" role="status">{status}</div>
          {svgSource && (
            <textarea className={`${area} min-h-[120px]`} aria-label="SVG source" readOnly value={svgSource}
              onFocus={(e) => e.currentTarget.select()} />
          )}
        </div>
      </details>
    </div>
  )
}
