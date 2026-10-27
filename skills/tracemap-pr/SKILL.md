---
name: tracemap-pr
description: Use Trace Map to add images to a pull request description that show the steps the PR's behaviour takes through the directory tree (trace maps). Use when asked to add, update or refresh Trace Map or trace maps on a PR, or when the repo's CLAUDE.md/AGENTS.md says to use this skill on PRs. Gets the images and their description from the `tracemap-images` skill and attaches them with `gh pr edit --attach` (or, where uploads are blocked, commits them to a `tracemap-assets` branch).
---

# Trace Map for pull requests

Puts the trace maps for a pull request into its description, or leaves them out when they would not help. Which images to draw and what to say about them is the job of the `tracemap-images` skill; this skill defines what it must hand back and gets it into the PR.

## Hard rules

- **At most five images per PR.** The `tracemap-images` skill enforces this too; check it anyway.
- **Never commit images to the PR branch** or anywhere in the working tree. Images and the section live in a temporary directory outside the repo and are thrown away afterwards. The only thing ever pushed is the `tracemap-assets` branch, and only through `push-assets.sh` (step 4).
- **Only touch the trace map section** of the PR description (between `<!-- tracemap:start -->` and `<!-- tracemap:end -->`). Everything else in the body stays byte for byte.
- **One fallback, no others.** Upload with `gh --attach` where it works; otherwise use the assets branch (step 4). If neither works, the PR gets no image. Say so and stop; do not link images any other way.

## 1. Check the tools

```sh
gh --version            # 2.99 or newer can upload with --attach
gh auth status          # a valid token with push access can upload
```

If `gh` is missing or older than 2.99, install the latest release (Linux or macOS, no root needed):

```sh
sh skills/tracemap-pr/scripts/install-gh.sh
```

It installs `gh` into `~/.local/bin` and prints that path. If `~/.local/bin` is not first in `PATH`, call `~/.local/bin/gh` instead of `gh` in the steps below. If the install fails (no network to github.com, another OS), stop and report it.

Then pick how images will reach the PR:

- **Upload** when `gh auth status` succeeds. This works locally, in Codex and in GitHub Actions with a personal token, and for private repos.
- **Assets branch** otherwise, for example in Claude Code cloud sessions, where a proxy adds credentials but blocks uploads (`gh auth status` fails there although `git push` and `gh api` work). The images are committed to a `tracemap-assets` branch and linked by commit.

Use `gh api` (REST) to read and write the PR in both cases: `gh pr view`, `gh pr diff` and `gh pr edit` use GraphQL, which some sandboxes block; `gh pr edit --attach` is used only when uploading works.

`gh api` fills in `{owner}/{repo}` from the git remote. If the remote is not a plain GitHub URL (some sandboxes point `origin` at a local git proxy) and `gh` cannot tell the repo, set `GH_REPO=owner/repo` for these commands; `push-assets.sh` reads it too.

## 2. Get the images

Make a temporary directory outside the repo:

```sh
dir=$(mktemp -d)
```

Invoke the `tracemap-images` skill (with the Skill tool, or by reading `skills/tracemap-images/SKILL.md` and following it where there is none). It knows nothing about pull requests, so give it everything in this contract:

- **Change to illustrate:** PR `<n>`. Its description and diff are read with
  ```sh
  gh api repos/{owner}/{repo}/pulls/<n> --jq '.title, .body'
  gh api repos/{owner}/{repo}/pulls/<n> -H 'Accept: application/vnd.github.diff'
  ```
- **Directory:** `$dir`.
- **Files to write there:**
  - `trace-map-1.svg`, `trace-map-2.svg`, … in the order the images appear, no gaps, at most five.
  - `section.md`: the markdown that goes into the PR description. It shows each image exactly once, as `![alt](./trace-map-N.svg)` with a relative path, and links to nothing else. It carries no `<!-- tracemap:… -->` markers; step 3 adds them.
- **Or nothing:** if no image would help, it writes no files and says the result is not applicable, with a sentence why.

Check what comes back before going on:

- **Files:** `section.md` exists, every `trace-map-N.svg` is referenced from it once and no other image is, the count is 1 to 5. If not, send it back to fix it.
- **Not applicable:** `$dir` holds no `trace-map-*.svg`. Go on with an empty section (below) so that an old section from an earlier run is removed.

## 3. Build the new body

Image references stay relative (`./trace-map-1.svg`); both ways of attaching rewrite them to real URLs. Keep `body.md` in `$dir`, because `gh` resolves the image paths relative to the body file's directory. For "not applicable", create an empty `$dir/section.md` first.

```sh
gh api repos/{owner}/{repo}/pulls/<n> --jq .body > "$dir/old-body.md"
node skills/tracemap-pr/scripts/splice-body.mjs "$dir/section.md" < "$dir/old-body.md" > "$dir/body.md"
```

`splice-body.mjs` replaces the section between `<!-- tracemap:start -->` and `<!-- tracemap:end -->` (each on a line of its own) or appends one at the end, so **re-running the skill on the same PR replaces the images instead of adding more**. With an empty section it removes it.

## 4. Update the PR

**Upload:**

```sh
gh pr edit <n> --body-file "$dir/body.md" --attach "$dir/trace-map-1.svg" --attach "$dir/trace-map-2.svg"
```

Pass each image to `--attach` exactly once. If `gh` exits non-zero, some uploads failed: report which, and re-run the whole step rather than patching the body by hand. If it fails before uploading anything because the environment blocks it, use the assets branch instead.

**Assets branch:**

```sh
sh skills/tracemap-pr/scripts/push-assets.sh <n> "$dir/trace-map-1.svg" "$dir/trace-map-2.svg" > "$dir/urls.txt"
while read -r file url; do
  sed -i.bak "s#(./$(basename "$file"))#($url)#" "$dir/body.md"
done < "$dir/urls.txt"
gh api -X PATCH repos/{owner}/{repo}/pulls/<n> -F body=@"$dir/body.md" --silent
```

`push-assets.sh` commits the images to `pr-<n>/` on the `tracemap-assets` branch (created on first use, without touching the working tree or the current branch), replacing that PR's earlier images, retries if another PR pushed at the same time, and prints `<file> <url>` per image. The URLs name the commit, so a re-run never shows a cached old image.

**Not applicable:** update the body without attachments (`gh pr edit <n> --body-file "$dir/body.md"`, or the `gh api -X PATCH` above), and on the assets branch run `push-assets.sh <n>` without files to remove the PR's folder.

## 5. Check and report

```sh
gh api repos/{owner}/{repo}/pulls/<n> --jq .body
```

The section should contain `https://github.com/user-attachments/assets/…` (upload) or `https://github.com/<owner>/<repo>/raw/<commit>/pr-<n>/…` (assets branch) URLs, not `./trace-map-N.svg`. Reply with how many images were added and why that number, or why none (the reason comes from `tracemap-images`, in your reply, not in the PR body). Then delete `$dir`.
