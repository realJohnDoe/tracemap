import { useEffect, useMemo, useRef, useState } from 'react'
import { buildTree, EXAMPLE, parseTrace, renderSvg } from '@tracetrail/core'
import { download, serializeSvg, svgToPngBlob } from './lib/export'

const btn = 'cursor-pointer rounded-md border border-line bg-panel px-3 py-[5px] text-[13px] text-ink hover:border-trail'
const lbl = 'flex justify-between text-[11px] uppercase tracking-[0.08em] text-muted'
const val = 'font-mono text-[13px] font-semibold normal-case tracking-normal text-ink'
const area = 'w-full resize-y whitespace-pre overflow-auto rounded-md border border-line bg-bg p-2.5 font-mono text-xs leading-normal text-ink'

export default function App() {
  const [text, setText] = useState(EXAMPLE)
  const [cur, setCur] = useState(5)
  const [trail, setTrail] = useState(3)
  const [showAll, setShowAll] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [status, setStatus] = useState('')
  const [svgSource, setSvgSource] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const steps = useMemo(() => parseTrace(text), [text])
  const rows = useMemo(() => buildTree(steps), [steps])
  const last = steps.length - 1
  const step = Math.min(Math.max(cur, 0), Math.max(last, 0))
  const trailMax = Math.max(1, last)
  const trailEff = Math.min(trail, trailMax)

  const svg = useMemo(
    () => (steps.length ? renderSvg(steps, rows, step, trailEff, showAll) : ''),
    [steps, rows, step, trailEff, showAll],
  )

  useEffect(() => {
    if (!playing) return
    if (step >= last) { setPlaying(false); return }
    const t = setTimeout(() => setCur(step + 1), 900)
    return () => clearTimeout(t)
  }, [playing, step, last])

  const go = (n: number) => { setPlaying(false); setCur(n) }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLInputElement
      if (/^(TEXTAREA|INPUT)$/.test(t.tagName) && t.type !== 'range') return
      if (e.key === 'ArrowLeft') go(step - 1)
      else if (e.key === 'ArrowRight') go(step + 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const togglePlay = () => {
    if (playing) return setPlaying(false)
    if (step >= last) setCur(0)
    setPlaying(true)
  }

  const loadText = (t: string) => { setPlaying(false); setText(t); setCur(0) }
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
    download(`trace-step-${step + 1}.svg`, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.source))
    setStatus('Export started. If nothing downloads, use Copy SVG instead.')
  }
  const savePng = async () => {
    const s = getSvg()
    if (!s) return
    try {
      const blob = await svgToPngBlob(s.el, s.source)
      const url = URL.createObjectURL(blob)
      download(`trace-step-${step + 1}.png`, url)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatus('Export started. If nothing downloads, use Copy SVG instead.')
    } catch {
      setStatus('PNG export failed. Use Copy SVG instead.')
    }
  }

  const s = steps[step]

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="m-0 text-[22px] font-semibold tracking-tight text-balance">Trace Trail</h1>
        <p className="m-0 max-w-[65ch] text-muted">
          Follows a trace through the directory tree. Pick a step and how many earlier steps stay highlighted.
        </p>
      </header>

      <section aria-label="Playback" className="grid grid-cols-1 gap-x-6 gap-y-3.5 rounded-lg border border-line bg-panel px-4 py-3.5 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="step" className={lbl}>
            Current step <b className={val}>{steps.length ? `${step + 1} / ${steps.length}` : '0 / 0'}</b>
          </label>
          <input id="step" type="range" min={1} max={Math.max(1, steps.length)} value={step + 1}
            onChange={(e) => go(Number(e.target.value) - 1)} />
          <div className="flex flex-wrap items-center gap-2">
            <button className={btn} aria-label="First step" onClick={() => go(0)}>⏮</button>
            <button className={btn} aria-label="Previous step" onClick={() => go(step - 1)}>◀</button>
            <button className={`${btn} !border-trail !bg-trail font-medium !text-bg`} onClick={togglePlay}>
              {playing ? 'Pause' : 'Play'}
            </button>
            <button className={btn} aria-label="Next step" onClick={() => go(step + 1)}>▶</button>
            <button className={btn} aria-label="Last step" onClick={() => go(last)}>⏭</button>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="trail" className={lbl}>
            Highlighted past steps <b className={val}>{trailEff}</b>
          </label>
          <input id="trail" type="range" min={0} max={trailMax} value={trailEff}
            onChange={(e) => setTrail(Number(e.target.value))} />
          <label className="inline-flex items-center gap-1.5 text-[13px]">
            <input type="checkbox" className="accent-trail" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Show the full route faintly
          </label>
        </div>
      </section>

      <div className="flex min-h-[3.2em] flex-col gap-0.5 px-0.5" aria-live="polite">
        {s && (
          <>
            <div className="break-words font-mono text-[13px] font-semibold">
              <span className="text-now">Step {step + 1}  </span>
              {s.path + (s.isDir ? '/' : '')}
            </div>
            <div className="text-muted">{s.note || ' '}</div>
          </>
        )}
      </div>

      <div ref={panelRef} className="overflow-x-auto rounded-lg border border-line bg-panel [&_svg]:block">
        {steps.length ? (
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
