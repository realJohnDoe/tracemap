# Quiet neutral grey, circles under the route, rounded corners

Decided from the prototype in #7; the exact values (hex colors, widths, radii) are in the [resolution comment on #7](https://github.com/realJohnDoe/tracetrail/issues/7#issuecomment-6396965212) and belong in core's code, not here. These are the choices that are easy to undo by accident:

- **The `gray` highlight is an ink tone**, near-black in the light theme and near-white in the dark theme, so it cannot be mistaken for neutral grey (ADR-0004, ADR-0006). Every other color passes 4.5:1 against its theme's background, which also covers the step number text on it.
- **Neutral grey is deliberately quiet.** The route and the tree share one 2 px line at about 1.5:1 contrast. That line is decoration; the structure is carried by the labels, which stay readable at 4.5:1 or better.
- **Tree node circles are drawn under the route.** Hollow circles drawn on top cut the highlighted route wherever it passes a directory and broke the visual flow. They are filled solid in neutral grey: a ring beside the rounded corners and line ends looked odd.
- **Corners are rounded (6 px)** on both the route and the tree elbows. A background-colored edge under the highlight and a larger radius were tried and rejected: the edge also cuts gaps in the circles and grey lines next to the route, and 10 px curves get cramped at the 16 px indent step.
- **Markers and step numbers:** a filled disc at the start and a target (ring with a dot) at the end of a highlight, one target for a one-step highlight. Step numbers are outlined pills after the label, e.g. `3 · 5` for a file visited twice in the highlight.
