# One trail spec shared by the web app and the CLI

Core exposes a single trail spec type that fully describes an image, and both front ends only build one: the CLI from its flags (or `--spec file.json`), the web app from its controls. The two have the same feature set; the web app changes settings interactively, the CLI renders once to a file. New rendering features are added to the trail spec first, never to one front end alone.

```ts
// Shape agreed during design; names may be refined in code.
type TrailSpec = {
  panels: [Panel] | [Panel, Panel] // two panels = side by side
  theme: 'light' | 'dark'
}
type Panel = { trace: string; title?: string; color?: ColorName; highlight?: [from: number, to: number] }
```

There is no layout field: side by side is the only arrangement for now.

"The same trail spec always yields the same image" is exact for SVG. PNG bytes also depend on the installed fonts (ADR-0010). The web app encodes a trail spec into a share link as described in ADR-0011.
