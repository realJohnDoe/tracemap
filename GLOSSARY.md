# Trace Map

Trace Map draws a trace as a trace map: the codebase's directory tree with the steps of one piece of behaviour highlighted, so a reader can see which files are involved and in what order. It is used from a web app and from a CLI that agents call to illustrate pull requests.

## Input

**Flow**:
The piece of behaviour a trace describes, in everyday words: "the checkout flow", "how a release gets approved". It runs through the codebase and, where it matters, through the people, devices and services around it. Use "flow" in prose, titles and descriptions, where readers do not know the word "trace"; use "trace" for the technical object that records one run of a flow.
_Avoid_: Workflow (means a CI workflow), flowchart, data flow (all suggest a drawn diagram of boxes and branches, which a trace map is not)

**Trace**:
An ordered list of steps that records one run of a flow through the codebase and, where relevant, beyond it.
_Avoid_: Path list, call graph, log

**Step**:
One entry of a trace: a file or directory path, optionally with a note. The same path may appear in several steps.
_Avoid_: Hop, visit, frame

**Root**:
The directory a trace's paths are relative to. Normally it is the repository root, and then paths are written plainly. A trace that spans several roots (more than one repository, or a directory outside the repository) puts each under a top-level group named after it. This is a convention of the agent skill, not a feature of the trace file format.
_Avoid_: Base, workspace

**Outside step**:
A step for something with no path under any root that the behaviour passes through: a released package, an external API, a service the team runs, a person who approves, a lab device. By the same skill convention it is an entry under a flat top-level group named for its kind (`external/` for third-party systems, `people/`, `devices/`, `services/`, or another fitting name), next to the groups for the roots. The names are chosen freely; nothing in the trace file format knows about them.
_Avoid_: External step (it suggests third-party only), remote step

**Note**:
Free text attached to a step that explains what happens there.
_Avoid_: Comment, label, description

**Trace file**:
The plain-text form of a trace: one step per line, in order. It is the only input contract; how it was produced (by hand, by an agent, from a test run or a tracer) does not matter.
_Avoid_: Trace log, input file

## Picture

**Trace map**:
The visualization: a tree with one trace's highlight drawn on it, or two of them side by side. It is what a reader sees in a pull request, a doc or the web app, and what an agent adds to illustrate a change or explain a flow.
_Avoid_: Trail, diagram, graph, chart

**Tree**:
The directory tree built from every path in the traces being drawn. Paths that no highlighted step visits are still part of the tree.
_Avoid_: File list, outline

**Trace line**:
The line that connects consecutive steps of a trace along the tree's own branches.
_Avoid_: Route (reads as a web-service route), path (means a file path here), trail, edge

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
How everything outside the highlight is drawn: the rest of the trace line and the tree alike, without distinguishing the two.
_Avoid_: Faint line, unused path

**Color**:
One of a fixed set of named colours (blue, red, green, orange, purple, gray) in which a highlight is drawn. A highlight in gray stays clearly distinct from neutral grey.
_Avoid_: Hex, style

**Theme**:
Light or dark rendering of the whole trace map. Light is the default.
_Avoid_: Mode, skin

## Images

**Panel**:
One tree with one trace's highlight, a color and an optional title.
_Avoid_: Graph, view, column

**Side by side**:
The only arrangement of two panels in one trace map: left and right, rows aligned, both drawn on the same tree.
_Avoid_: Row layout, column layout, split view

**Comparison**:
A trace map of two panels side by side, typically before and after a change.
_Avoid_: Diff (reserved for a possible future overlay trace map)

**Trace map spec**:
The complete description of one trace map: its panels and its theme. The web app and the CLI both produce one, and the same trace map spec always yields the same image.
_Avoid_: Config, options, settings

**Image**:
The rendered file of a trace map, as SVG or PNG. Say "image" only when the file is meant, for example "export the trace map as an image"; otherwise say trace map.
_Avoid_: Trail image, screenshot

**Share link**:
A URL of the web app whose fragment holds a trace map spec, so that opening it shows the same trace map.
_Avoid_: Permalink, short link
