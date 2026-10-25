---
name: pr-trail-images
description: Add trail images to a pull request description, drawing the route the PR's behaviour takes through the directory tree. Use when asked to add, update or refresh trail images on a PR, or when the repo's CLAUDE.md/AGENTS.md says to use this skill on PRs. Decides whether images help and how many (1 to 5), writes trace files, renders them with `tracetrail render`, and attaches them with `gh pr edit --attach`.
---

# PR trail images

Adds one to five trail images to a pull request description, or none when they would not help. Terms: a **trace** is an ordered list of **steps** (file or directory paths with an optional **note**), a **highlight** is the one interval of steps drawn in colour, a **trail image** is the rendered result.

## Hard rules

- **At most five images per PR.** If more seem necessary, make the trace coarser (directories instead of files, fewer steps) instead.
- **Never commit or push anything for the images.** No assets branch, no files in the PR branch. Trace files and SVGs live in a temporary directory outside the repo and are thrown away afterwards.
- **Only touch the trail image section** of the PR description (between `<!-- tracetrail:start -->` and `<!-- tracetrail:end -->`). Everything else in the body stays byte for byte.
- **No fallback.** If `gh` cannot be brought to 2.99+ (step 1), is not authenticated, or the upload fails, the PR gets no image. Say so and stop; do not link images some other way.

## 1. Check the tools

```sh
gh --version            # needs 2.99 or newer for --attach
gh auth status          # needs a valid token with push access to the repo
npx tracetrail --help   # in this repo: run from the workspace root after npm install
```

If `gh` is missing or older than 2.99, install the latest release (Linux or macOS, no root needed):

```sh
sh skills/pr-trail-images/scripts/install-gh.sh
```

It installs `gh` into `~/.local/bin` and prints that path. If `~/.local/bin` is not first in `PATH`, call `~/.local/bin/gh` instead of `gh` in the steps below. It uses the same credentials (`GH_TOKEN` or the `gh` config), so installing does not fix a missing or invalid token. If the install fails (no network to github.com, another OS), stop and report it.

In this repo the CLI runs from the workspace (`npx tracetrail`, which resolves to `packages/cli`), not from npm. Elsewhere use `npx trace-trail` once it is published.

If `gh` is not authenticated, stop here and report it. Rendering images that cannot be attached is wasted work.

## 2. Read the PR and decide

Read the PR's description and diff:

```sh
gh pr view <n> --json number,title,body,headRefName,baseRefName
gh pr diff <n>
```

Then decide, aiming for whatever makes the PR easiest for a human reviewer to follow:

| PR shape | Images |
| --- | --- |
| Small change along one flow (a bug fix in a handler, a new option threaded through) | **1**: the whole trace highlighted |
| Long feature along one flow | **One trace, 2–5 images**, each highlighting a consecutive segment (e.g. steps 1–6 "request in", 7–12 "persistence", 13–17 "response"). Same trace file every time, so the tree is identical and the reader sees where each segment sits |
| Several independent flows (CLI and web app both changed, a producer and a consumer) | **One image per flow**, each with its own trace |
| Bug fix or refactor whose route changed | Before/after comparison: **not yet available** (needs `tracetrail compare`). Until then, one image of the new route, or none |

**Add no images** when the route does not tell the reader anything: docs-only or config-only PRs, dependency bumps, renames, formatting, a change confined to one file, test-only changes, or anything where every step would be the same file. Say in one sentence why none were added (in your reply, not in the PR body).

When unsure between N and N+1 images, choose fewer. One clear image beats three similar ones.

## 3. Write the trace files

Work in a temporary directory outside the repo:

```sh
dir=$(mktemp -d)
```

A trace file has one step per line, in execution order: a repo-relative path (a directory ends in `/`), then optionally ` # ` and a note. Lines starting with `#` are comments.

```text
# Trace: tracetrail render with a trail spec
packages/cli/bin/tracetrail.js     # Entry point loads the TypeScript sources
packages/cli/src/main.ts           # render() reads and checks the --spec JSON
packages/core/src/trace.ts         # parseTrace() turns each panel's text into steps
packages/core/src/render.ts        # renderTrail() lays out the tree and draws the SVG
packages/cli/src/main.ts           # The SVG is written to --output
```

Guidelines:

- Trace **one run of behaviour**, in the order it executes, not the list of changed files. Read the code to follow the flow; include unchanged files the flow passes through when they help orientation.
- A trace can also be recorded instead of read from the code, for example by running the tests the PR touches under a tracer. If the repo's `CLAUDE.md`/`AGENTS.md` describes a way, use it; otherwise you may devise one (a tracer such as `sys.settrace`, temporary logging), as long as it leaves no changes in the working tree and the result is better than reading the code. A recorded trace is raw material. Before rendering, keep only paths in the repo (drop the standard library, dependencies and test framework internals), merge repeated steps that follow each other, cut it to the part the PR is about, and add notes. The same limits apply as for a hand-written trace.
- Write a short note on each step saying what happens there. The renderer does not draw notes yet, but they document the trace while you write it and the captions can draw on them.
- Aim for 4–15 steps per image. Revisiting a file is fine and shows up as two step numbers.
- To show files that matter but are not part of the flow (a new test, a fixture), append them after a comment line and leave them outside the highlight.
- Too many steps or too wide a tree: use directories (`packages/core/src/`) instead of files.

## 4. Render

Run from the repo root, writing into `$dir` with names `trail-1.svg`, `trail-2.svg`, … in the order the images will appear:

```sh
npx tracetrail render "$dir/flow.trace" --title "Render a trail spec" -o "$dir/trail-1.svg"
npx tracetrail render "$dir/flow.trace" --title "Response" --highlight 13-17 -o "$dir/trail-2.svg"
```

- `--title`: a short name for the flow or segment.
- `--highlight A-B`: for segments of one long trace.
- `--color`: keep the default (blue) unless two images must be told apart at a glance.

Look at the SVGs before attaching them if you can (for example a headless-browser screenshot); fix the trace and re-render if the picture is cramped or misleading.

## 5. Write the section and update the PR

Write the section in `$dir/section.md`. Image references are relative (`./trail-1.svg`), and `gh` rewrites them to the uploaded `user-attachments` URLs. Each image gets a short caption tied to the PR text: what the reader should look at, in the PR's own terms.

```markdown
## Trail images

**Render a trail spec.** `--spec` now goes through the same checks as the flags (step 2) before core draws it.

![Route of tracetrail render --spec through cli and core](./trail-1.svg)
```

Use the alt text to describe the route in words. Keep captions to one or two sentences.

Then splice the section into the current body and update the PR in one command. Keep `body.md` in `$dir`, because `gh` resolves the image paths relative to the body file's directory:

```sh
gh pr view <n> --json body --jq .body > "$dir/old-body.md"
node skills/pr-trail-images/scripts/splice-body.mjs "$dir/section.md" < "$dir/old-body.md" > "$dir/body.md"
gh pr edit <n> --body-file "$dir/body.md" --attach "$dir/trail-1.svg" --attach "$dir/trail-2.svg"
```

`splice-body.mjs` replaces an existing `<!-- tracetrail:start -->…<!-- tracetrail:end -->` section or appends one at the end, so **re-running the skill on the same PR replaces the images instead of adding more**. If the new decision is "no images" on a PR that has a section, run it with an empty `section.md` to remove the section (and no `--attach`).

Pass each image to `--attach` exactly once. If `gh` exits non-zero, some uploads failed: report which, and re-run the whole step rather than patching the body by hand.

## 6. Check and report

```sh
gh pr view <n> --json body --jq .body
```

The section should contain `https://github.com/user-attachments/assets/…` URLs, not `./trail-N.svg`. Reply with how many images were added and why that number, or why none. Then delete `$dir`.
