# SVG first, system monospace, named colors, light by default

The main target is GitHub pull requests, which show SVG images referenced by URL (raw.githubusercontent.com serves them as `image/svg+xml`) but render them as `<img>`, which never loads external resources such as web fonts. So:

- SVG is the default output; PNG (`--png`) is the fallback for places that will not show SVG.
- Text uses a system monospace font stack and no font is embedded. Layout assumes the usual 0.6 em monospace advance width; embedding a font subset would add ~15–25 KB per image and a build step.
- Colors are a fixed set of names with values defined in core; arbitrary hex is not accepted. The highlighted `gray` must stay clearly distinguishable from neutral grey.
- One light image is the default; `--dark-mode` renders a dark variant when needed, instead of always emitting a light/dark pair or relying on `prefers-color-scheme` (which follows the OS, not the GitHub theme).

PNG is rendered with resvg-js and fails with an error when no monospace font is installed; see ADR-0010.
