# Comparisons are one image with two panels side by side

A before/after comparison is rendered as a single image containing two panels side by side, both drawn on the same tree (built from the paths of both traces), so rows line up exactly. This gives cleaner, self-contained images than placing two separate images next to each other in a markdown table. The words "row" and "column" are not used for this; it is called side by side everywhere.

The CLI has a separate `compare LEFT RIGHT` command whose per-panel options are named after the side: `--left-title`, `--left-color`, `--left-highlight`, `--right-…`. Default titles are "before" and "after"; both sides default to the same color, since red/green implies one side is wrong, which does not fit a refactor.

## Considered Options

- **Repeated flags applied in input order** (`diff --label A --label B`): compact, but a missing flag silently shifts values to the wrong side, an easy mistake for an agent.
- **Options apply to the following input** (ffmpeg, ImageMagick `montage`): order-sensitive in the same way and unusual for compare tools.
- **Side-named flags** (kdiff3 `--L1/--L2`, `delta --minus-*/--plus-*`) was chosen as the most explicit.
