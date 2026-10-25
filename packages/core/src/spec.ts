/** The named colors a highlight can be drawn in (ADR-0006). */
export const COLOR_NAMES = ['blue', 'red', 'green', 'orange', 'purple', 'gray'] as const
export type ColorName = (typeof COLOR_NAMES)[number]

/** Only the light theme exists for now; dark is added with its own palette. */
export type Theme = 'light'

/** One tree with one trace's highlight (ADR-0004). */
export interface Panel {
  /** Trace file text (ADR-0002). */
  trace: string
  /** Drawn above the tree. */
  title?: string
  /** Defaults to blue. */
  color?: ColorName
  /**
   * The highlighted steps as 1-based positions in the trace, both inclusive and clamped to it.
   * Omitted means the whole trace is highlighted.
   */
  highlight?: [from: number, to: number]
}

/** The complete description of one trail image (ADR-0003). */
export interface TrailSpec {
  /** Two panels are side by side (ADR-0005), which is not rendered yet. */
  panels: [Panel] | [Panel, Panel]
  /** Defaults to light. */
  theme?: Theme
}

interface Palette {
  background: string
  ink: string
  neutralLine: string
  neutralLabel: string
  colors: Record<ColorName, string>
}

// Values chosen in the palette prototype, see ADR-0012 and its link to #7.
export const PALETTES: Record<Theme, Palette> = {
  light: {
    background: '#ffffff',
    ink: '#1f2328',
    neutralLine: '#d0d7de',
    neutralLabel: '#6e7781',
    colors: {
      blue: '#2563eb',
      red: '#dc2626',
      green: '#15803d',
      orange: '#c2410c',
      purple: '#7e22ce',
      gray: '#111827',
    },
  },
}
