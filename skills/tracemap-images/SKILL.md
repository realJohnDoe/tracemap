---
name: tracemap-images
description: Use Trace Map to draw trace maps that show the steps a piece of behaviour takes through a codebase's directory tree, with a short description for each. Use when asked to illustrate how something works or what a change touches in docs, READMEs, ADRs, tutorials, issues, design notes or onboarding guides, or when another skill such as `tracemap-pr` asks for images. Decides whether images help and how many (1 to 5), writes trace files, renders them with `tracemap render`, and writes the images and their description into a directory the caller or user names.
---

# Trace maps

Produces one to five trace maps with a description each, or says that none would help. Terms: a **trace** is an ordered list of **steps** (file or directory paths with an optional **note**), a **trace map** is the directory tree with a trace drawn on it, a **highlight** is the one interval of steps drawn in colour, an **image** is the rendered file of a trace map.

This skill does not publish anything. It is used in two ways:

- **From another skill** (for example `tracemap-pr`), which tells you what to illustrate, which directory to write into and what the files must be called and look like. Follow that.
- **Directly**, for a doc, README, ADR, tutorial, issue, design note or onboarding guide: a request such as "show how a request flows through the server" or "illustrate the checkout flow in this tutorial". You then decide the rest: write the images into the directory the user names (ask if they did not and it is not obvious, for example next to the document), as `trace-map-1.svg`, `trace-map-2.svg`, … plus `section.md` with the descriptions, and offer to paste the section into the document. Name the files for what they show instead (`checkout-flow.svg`) when they will live in a docs folder.

What is illustrated can be a change (a diff, a PR, a commit) or existing behaviour that has no diff at all.

## Hard rules

- **At most five images.** If more seem necessary, make the trace coarser (directories instead of files, fewer steps) instead.
- **Write only into the named directory.** Trace files and scratch work never go into the working tree. The images and description go where the caller or user says, even inside the repo when it is for a doc; nothing else in the working tree changes.
- **Two outcomes, nothing in between.** Either the files are written, or nothing is written and you say the result is **not applicable**, with one sentence why. Never a partial set.

## 1. Check the tool

```sh
npx --yes @realjohndoe/tracemap@1 --help
```

Always use the published CLI (`@realjohndoe/tracemap` on npm), in this repo too, so the skill works the same everywhere and needs no `npm install`. Every command below is `npx --yes @realjohndoe/tracemap@1 …`; `@1` takes every 1.x release and never a breaking change, so move it to the next major only after checking this skill against it. If the CLI cannot run (for example, no network access to npm), stop and report it.

## 2. Read the change and decide

Read what is to be illustrated: for a change, its description and diff, wherever the caller points you to them; for existing behaviour, the code it runs through. Then decide, aiming for whatever makes it easiest for the reader (a reviewer, a new contributor, someone following a tutorial) to follow:

| Subject | Images |
| --- | --- |
| Small change or small behaviour along one flow (a bug fix in a handler, a new option threaded through) | **1**: the whole trace highlighted |
| Long feature or flow | **One trace, 2–5 images**, each highlighting a consecutive segment (e.g. steps 1–6 "request in", 7–12 "persistence", 13–17 "response"). Same trace file every time, so the tree is identical and the reader sees where each segment sits |
| Several independent flows (CLI and web app both changed, a producer and a consumer) | **One image per flow**, each with its own trace |
| Bug fix or refactor whose flow changed | Before/after comparison: **not yet available** (needs `tracemap compare`). Until then, one trace map of the new flow, or none |

**Not applicable** when the trace does not tell the reader anything: prose-only docs, plain config, dependency bumps, renames, formatting, a change confined to one file, test-only changes, or anything where every step would be the same file. Files that steer behaviour count as part of a trace even when they are not code: an agent skill that calls another skill, a workflow that runs a script, a hook. If following them gives an ordered run across several files, draw it. When the user asked for the images directly, lean towards drawing them: say if you think they add little, but do not refuse a clear request.

When unsure between N and N+1 images, choose fewer. One clear image beats three similar ones.

## 3. Write the trace files

Keep the trace files in a scratch directory outside the repo (`mktemp -d`), not in the caller's directory. A trace file has one step per line, in execution order: a repo-relative path (a directory ends in `/`), then optionally ` # ` and a note. Lines starting with `#` are comments.

```text
# Trace: tracemap render with a trace map spec
packages/cli/bin/tracemap.js     # Entry point loads the TypeScript sources
packages/cli/src/main.ts           # render() reads and checks the --spec JSON
packages/core/src/trace.ts         # parseTrace() turns each panel's text into steps
packages/core/src/render.ts        # renderTraceMap() lays out the tree and draws the SVG
packages/cli/src/main.ts           # The SVG is written to --output
```

Guidelines:

- Trace **one run of behaviour**, in the order it executes, not the list of changed files. Read the code to follow the flow; include unchanged files the flow passes through when they help orientation.
- A trace can also be recorded instead of read from the code, for example by running the tests the change touches under a tracer. If the repo's `CLAUDE.md`/`AGENTS.md` describes a way, use it; otherwise you may devise one (a tracer such as `sys.settrace`, temporary logging), as long as it leaves no changes in the working tree and the result is better than reading the code. A recorded trace is raw material. Before rendering, keep only paths in the repo (drop the standard library, dependencies and test framework internals), merge repeated steps that follow each other, cut it to the part the change is about, and add notes. The same limits apply as for a hand-written trace.
- Write a short note on each step saying what happens there. The renderer does not draw notes yet, but they document the trace while you write it and the descriptions can draw on them.
- Aim for 4–15 steps per image. Revisiting a file is fine and shows up as two step numbers.
- To show files that matter but are not part of the flow (a new test, a fixture), append them after a comment line and leave them outside the highlight.
- Too many steps or too wide a tree: use directories (`packages/core/src/`) instead of files.

## 4. Render

Run from the repo root, writing into the caller's directory, with the file names the caller asked for, in the order the images will appear:

```sh
npx --yes @realjohndoe/tracemap@1 render "$scratch/flow.trace" --title "Render a trace map spec" -o "$out/trace-map-1.svg"
npx --yes @realjohndoe/tracemap@1 render "$scratch/flow.trace" --title "Response" --highlight 13-17 -o "$out/trace-map-2.svg"
```

- `--title`: a short name for the flow or segment.
- `--highlight A-B`: for segments of one long trace.
- `--color`: keep the default (blue) unless two images must be told apart at a glance.

Look at the SVGs if you can (for example a headless-browser screenshot); fix the trace and re-render if the picture is cramped or misleading.

## 5. Write the description

Each image gets a description above it, so a reader can follow the picture without decoding it: a bold title, then a short paragraph (about 3–6 sentences) that walks the highlighted steps by their step numbers in the reader's own terms, says which steps the change touches (when illustrating a change), and names what is drawn in grey and why. Notes from the trace are good raw material, since the renderer does not draw them.

Put the descriptions, with the images embedded, in the markdown file the caller asked for, in the form the caller specified. The example below shows the wording for a change; the caller decides where the file goes and how images are referenced. For a doc or tutorial, replace the heading with one that fits the document, and drop the sentence about what the change touches.

```markdown
## How this change runs through the code

**Render a trace map spec.** The blue line is one `tracemap render --spec` run. The entry point (1) hands over to `main.ts` (2), which now runs the same checks on the spec as on the flags; this is the change in this PR. Core parses each panel's trace (3) and draws the SVG (4), and `main.ts` writes it to `--output` (5). In grey: the new test, which exercises the same route.

![Trace map of tracemap render --spec: the entry point, main.ts, core's trace.ts and render.ts, back to main.ts; the new test in grey](./trace-map-1.svg)

<sub>Drawn with [Trace Map](https://github.com/realJohnDoe/tracemap).</sub>
```

Keep the heading in a change description and the closing credit line as they are: readers do not know the term "trace map", so the heading says what the pictures show, and the credit line tells them where they come from. With several images, each gets its own bold title and description, and the credit line comes once at the end. The alt text is a one-line summary of the route, for screen readers and for when the image does not load.

## 6. Report

Say which of the two outcomes it is: the files written (how many images, and why that number), or **not applicable** (and why, in one sentence). Delete your scratch directory.
