# PNG is rendered with resvg-js and needs an installed monospace font

`--png` converts the trace map SVG with `@resvg/resvg-js`, which needs no browser. It is a regular dependency of the `trace-trail` CLI (a native addon cannot be bundled, unlike core, see ADR-0001) and is imported only when `--png` is used, so the default SVG path never loads it.

Text uses the system monospace font stack and no font is embedded (ADR-0006), so the renderer must load system fonts. If no monospace font can be found, resvg silently draws an image without any text. Such an image is unusable, so the CLI **exits with an error** instead of writing the PNG. The error says that a monospace font must be installed (for example DejaVu Sans Mono or Liberation Mono in a bare container image). SVG output is unaffected, because the viewer picks the font.

PNG bytes are deterministic only for the same SVG and the same installed fonts; ADR-0003's "same trace map spec, same image" holds exactly for SVG only. Tests compare SVG (ADR-0009), not PNG bytes.

Measurements are in the [research comment on #5](https://github.com/realJohnDoe/tracetrail/issues/5#issuecomment-6396330393).

## Considered Options

- **`sharp`**: same quality and speed, but ~30 MB installed against ~4 MB, and a slower install.
- **`@resvg/resvg-wasm`**: no native binary, but wasm cannot read system fonts, so a font would have to be embedded, which ADR-0006 rules out.
