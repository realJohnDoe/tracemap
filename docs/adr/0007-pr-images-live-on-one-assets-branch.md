# PR images live on one assets branch in the target repo

The skill commits trail images, together with the trace files and trail specs that produced them, to a single `tracetrail-assets` branch in the target repository, one folder per pull request (`pr-<n>/`). One branch for all PRs avoids cluttering the repo with branches; committing into the PR branch itself was rejected because it pollutes the diff, and CI artifacts were rejected because they do not render inline. Keeping the inputs lets images be re-rendered later without recreating the trace.

## How images get into the PR body

Originally we believed GitHub had no way to upload images into a pull request description outside the browser, so the branch was also the display path, linked by raw URL. That is no longer true: `gh` 2.99+ has a repeatable `--attach` flag on `gh pr create`, `gh pr edit` and `gh pr comment` (github.com and GHE Cloud only; needs push access). The skill therefore embeds images in this order:

1. `gh --attach`, when `gh` is 2.99 or newer and the upload succeeds. It produces `user-attachments` URLs that inherit the repo's visibility, so images also render in private repos.
2. Otherwise a link to the assets branch: `https://raw.githubusercontent.com/<owner>/<repo>/<commit-sha>/pr-<n>/<name>.svg` for public repos, `https://github.com/<owner>/<repo>/raw/<commit-sha>/pr-<n>/<name>.svg` for private repos (only visible to logged-in viewers with access). Use a commit SHA rather than the branch name so the link is stable and not cached stale.

The branch is written either way, because `--attach` stores only the image, not the trace file and trail spec.

## Writing the branch

- Create it as an orphan branch the first time, append to it afterwards.
- Concurrent PRs write to different `pr-<n>/` folders, so conflicts do not occur, but a simultaneous push is rejected with `cannot lock ref`. The skill fetches, rebases and retries a few times; it never force-pushes.
- Sandboxed agents may be limited to their own branch. The environment must allow pushing `tracetrail-assets`, and in GitHub Actions the job needs `permissions: contents: write` (fork PRs get a read-only token and get no images).

Verified in a Claude Code cloud session on this repo (orphan creation, append, concurrent push, public raw URL). `gh --attach`, private-repo URLs, Codex and GitHub Actions are from documentation and not yet tested; see issue 6.
