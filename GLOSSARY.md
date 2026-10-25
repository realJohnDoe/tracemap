# Trace Trail

Trace Trail draws the route a piece of behaviour takes through a codebase's directory tree, so a reader can see which files are involved and in what order. It is used from a web app and from a CLI that agents call to illustrate pull requests.

## Input

**Trace**:
An ordered list of steps describing one run of behaviour through the codebase.
_Avoid_: Path list, call graph, log

**Step**:
One entry of a trace: a file or directory path, optionally with a note. The same path may appear in several steps.
_Avoid_: Hop, visit, frame

**Note**:
Free text attached to a step that explains what happens there.
_Avoid_: Comment, label, description

**Trace file**:
The plain-text form of a trace: one step per line, in order. It is the only input contract; how it was produced (by hand, by an agent, from a test run or a tracer) does not matter.
_Avoid_: Trace log, input file

## Picture

**Tree**:
The directory tree built from every path in the traces being drawn. Paths that no highlighted step visits are still part of the tree.
_Avoid_: File list, outline

**Route**:
The line that connects consecutive steps of a trace along the tree's own branches.
_Avoid_: Path (means a file path here), trail, edge

**Highlight**:
The one contiguous interval of steps that is drawn in colour. A single step is an interval of one. Without an explicit highlight, the whole trace is highlighted.
_Avoid_: Selection, segment (when meaning the drawn interval), current step

**Step number**:
The number shown next to a highlighted step. Numbering starts at 1 at the first highlighted step; steps outside the highlight have no number.
_Avoid_: Index, chip

**Marker**:
The symbol at the start and at the end of a highlight. A highlight of one step has a single marker.
_Avoid_: Pin, dot, endpoint

**Neutral grey**:
How everything outside the highlight is drawn: the rest of the route and the tree alike, without distinguishing the two.
_Avoid_: Faint route, unused path

**Color**:
One of a fixed set of named colours (blue, red, green, orange, purple, gray) in which a highlight is drawn. A highlight in gray stays clearly distinct from neutral grey.
_Avoid_: Hex, style

**Theme**:
Light or dark rendering of the whole image. Light is the default.
_Avoid_: Mode, skin

## Images

**Panel**:
One tree with one trace's highlight, a color and an optional title.
_Avoid_: Graph, view, column

**Side by side**:
The only arrangement of two panels in one image: left and right, rows aligned, both drawn on the same tree.
_Avoid_: Row layout, column layout, split view

**Comparison**:
An image of two panels side by side, typically before and after a change.
_Avoid_: Diff (reserved for a possible future overlay image)

**Trail spec**:
The complete description of one image: its panels and its theme. The web app and the CLI both produce one, and the same trail spec always yields the same image.
_Avoid_: Config, options, settings

**Trail image**:
The rendered result of a trail spec, as SVG or PNG.
_Avoid_: Screenshot, graph, chart
