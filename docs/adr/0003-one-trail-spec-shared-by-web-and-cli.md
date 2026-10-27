# One trace map spec shared by the web app and the CLI

_Formerly called the "trail spec"; the vocabulary was renamed in the glossary and the file names of ADR-0003, -0009, -0011 and -0012 were kept._

Core exposes a single trace map spec type that fully describes an image, and both front ends only build one: the CLI from its flags (or `--spec file.json`), the web app from its controls. The two have the same feature set; the web app changes settings interactively, the CLI renders once to a file. New rendering features are added to the trace map spec first, never to one front end alone.

```ts
// Shape agreed during design; names may be refined in code.
type TraceMapSpec = {
  panels: [Panel] | [Panel, Panel] // two panels = side by side
  theme: 'light' | 'dark'
}
type Panel = { trace: string; title?: string; color?: ColorName; highlight?: [from: number, to: number] }
```

There is no layout field: side by side is the only arrangement for now.

"The same trace map spec always yields the same image" is exact for SVG. PNG bytes also depend on the installed fonts (ADR-0010). The web app encodes a trace map spec into a share link as described in ADR-0011.
