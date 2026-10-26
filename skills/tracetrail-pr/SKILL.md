---
name: tracetrail-pr
description: Use Trace Trail to add images to a pull request description that show the route the PR's behaviour takes through the directory tree (trail images). Use when asked to add, update or refresh Trace Trail or trail images on a PR, or when the repo's CLAUDE.md/AGENTS.md says to use this skill on PRs. Decides whether images help and how many (1 to 5), writes trace files, renders them with `tracetrail render`, and attaches them with `gh pr edit --attach` (or, where uploads are blocked, commits them to a `tracetrail-assets` branch).
---

# Trace Trail for pull requests

Adds one to five trail images to a pull request description, or none when they would not help. Terms: a **trace** is an ordered list of **steps** (file or directory paths with an optional **note**), a **highlight** is the one interval of steps drawn in colour, a **trail image** is the rendered result.

## Hard rules

- **At most five images per PR.** If more seem necessary, make the trace coarser (directories instead of files, fewer steps) instead.
- **Never commit images to the PR branch** or anywhere in the working tree. Trace files and SVGs live in a temporary directory outside the repo and are thrown away afterwards. The only thing ever pushed is the `tracetrail-assets` branch, and only through `push-assets.sh` (step 5).
- **Only touch the trail image section** of the PR description (between `<!-- tracetrail:start -->` and `<!-- tracetrail:end -->`). Everything else in the body stays byte for byte.
- **One fallback, no others.** Upload with `gh --attach` where it works; otherwise use the assets branch (step 5). If neither works, the PR gets no image. Say so and stop; do not link images any other way.

## 1. Check the tools

```sh
gh --version            # 2.99 or newer can upload with --attach
gh auth status          # a valid token with push access can upload
npx tracetrail --help   # in this repo: run from the workspace root after npm install
```

If `gh` is missing or older than 2.99, install the latest release (Linux or macOS, no root needed):

```sh
sh skills/tracetrail-pr/scripts/install-gh.sh
```

It installs `gh` into `~/.local/bin` and prints that path. If `~/.local/bin` is not first in `PATH`, call `~/.local/bin/gh` instead of `gh` in the steps below. If the install fails (no network to github.com, another OS), stop and report it.

Then pick how images will reach the PR:

- **Upload** when `gh auth status` succeeds. This works locally, in Codex and in GitHub Actions with a personal token, and for private repos.
- **Assets branch** otherwise, for example in Claude Code cloud sessions, where a proxy adds credentials but blocks uploads (`gh auth status` fails there although `git push` and `gh api` work). The images are committed to a `tracetrail-assets` branch and linked by commit.

Use `gh api` (REST) to read and write the PR in both cases: `gh pr view`, `gh pr diff` and `gh pr edit` use GraphQL, which some sandboxes block; `gh pr edit --attach` is used only when uploading works.

`gh api` fills in `{owner}/{repo}` from the git remote. If the remote is not a plain GitHub URL (some sandboxes point `origin` at a local git proxy) and `gh` cannot tell the repo, set `GH_REPO=owner/repo` for these commands; `push-assets.sh` reads it too.

In this repo the CLI runs from the workspace (`npx tracetrail`, which resolves to `packages/cli`), not from npm. Elsewhere use `npx trace-trail` once it is published.

## 2. Read the PR and decide

Read the PR's description and diff:

```sh
gh api repos/{owner}/{repo}/pulls/<n> --jq '.title, .body'
gh api repos/{owner}/{repo}/pulls/<n> -H 'Accept: application/vnd.github.diff'
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

Write the section in `$dir/section.md`. Image references are relative (`./trail-1.svg`); both ways of attaching rewrite them to real URLs.

Each image gets a description above it, so a reader can follow the picture without decoding it: a bold title, then a short paragraph (about 3–6 sentences) that walks the highlighted route by its step numbers in the PR's own terms, says which steps the PR changes, and names what is drawn in grey and why. Notes from the trace are good raw material, since the renderer does not draw them.

```markdown
## How this change runs through the code

**Render a trail spec.** The blue route is one `tracetrail render --spec` run. The entry point (1) hands over to `main.ts` (2), which now runs the same checks on the spec as on the flags; this is the change in this PR. Core parses each panel's trace (3) and draws the SVG (4), and `main.ts` writes it to `--output` (5). In grey: the new test, which exercises the same route.

![Route of tracetrail render --spec: the entry point, main.ts, core's trace.ts and render.ts, back to main.ts; the new test in grey](./trail-1.svg)

<sub>Drawn with [Trace Trail](https://github.com/realJohnDoe/tracetrail).</sub>
```

Use this heading and the closing credit line as they are: reviewers do not know the term "trail image", so the heading says what the pictures show, and the credit line tells them where they come from. With several images, each gets its own bold title and description, and the credit line comes once at the end.

The alt text is a one-line summary of the route, for screen readers and for when the image does not load.

Splice the section into the current body. Keep `body.md` in `$dir`, because `gh` resolves the image paths relative to the body file's directory:

```sh
gh api repos/{owner}/{repo}/pulls/<n> --jq .body > "$dir/old-body.md"
node skills/tracetrail-pr/scripts/splice-body.mjs "$dir/section.md" < "$dir/old-body.md" > "$dir/body.md"
```

`splice-body.mjs` replaces the section between `<!-- tracetrail:start -->` and `<!-- tracetrail:end -->` (each on a line of its own) or appends one at the end, so **re-running the skill on the same PR replaces the images instead of adding more**.

**Upload:**

```sh
gh pr edit <n> --body-file "$dir/body.md" --attach "$dir/trail-1.svg" --attach "$dir/trail-2.svg"
```

Pass each image to `--attach` exactly once. If `gh` exits non-zero, some uploads failed: report which, and re-run the whole step rather than patching the body by hand. If it fails before uploading anything because the environment blocks it, use the assets branch instead.

**Assets branch:**

```sh
sh skills/tracetrail-pr/scripts/push-assets.sh <n> "$dir/trail-1.svg" "$dir/trail-2.svg" > "$dir/urls.txt"
while read -r file url; do
  sed -i.bak "s#(./$(basename "$file"))#($url)#" "$dir/body.md"
done < "$dir/urls.txt"
gh api -X PATCH repos/{owner}/{repo}/pulls/<n> -F body=@"$dir/body.md" --silent
```

`push-assets.sh` commits the images to `pr-<n>/` on the `tracetrail-assets` branch (created on first use, without touching the working tree or the current branch), replacing that PR's earlier images, retries if another PR pushed at the same time, and prints `<file> <url>` per image. The URLs name the commit, so a re-run never shows a cached old image.

**No images any more:** if the new decision is "no images" on a PR that has a section, splice with an empty `section.md`, update the body without attachments, and on the assets branch run `push-assets.sh <n>` without files to remove the PR's folder.

## 6. Check and report

```sh
gh api repos/{owner}/{repo}/pulls/<n> --jq .body
```

The section should contain `https://github.com/user-attachments/assets/…` (upload) or `https://github.com/<owner>/<repo>/raw/<commit>/pr-<n>/…` (assets branch) URLs, not `./trail-N.svg`. Reply with how many images were added and why that number, or why none. Then delete `$dir`.
