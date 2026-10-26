import { FONT_FAMILY } from '@tracemap/core'

/** PNG width in pixels is the SVG's own width times this, for a sharper image. */
const SCALE = 2

const PROBE = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="20" font-family="${FONT_FAMILY}" font-size="13"><text x="0" y="14">Mm</text></svg>`

/**
 * Converts a trace map SVG to PNG bytes with resvg (ADR-0010). The native addon is imported here,
 * not at the top of the CLI, so the default SVG path never loads it.
 * Throws when no monospace font is installed, since resvg would draw an image without text.
 */
export async function svgToPng(svg: string): Promise<Buffer> {
  const { Resvg } = await import('@resvg/resvg-js')
  const options = { font: { loadSystemFonts: true }, fitTo: { mode: 'zoom' as const, value: SCALE } }
  if (!new Resvg(PROBE, options).getBBox()) {
    throw new Error('No monospace font is installed, so the PNG would have no text. Install one (for example DejaVu Sans Mono or Liberation Mono) and try again.')
  }
  return new Resvg(svg, options).render().asPng()
}
