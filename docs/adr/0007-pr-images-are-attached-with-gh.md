# PR images are attached with `gh --attach`

The skill puts trail images into a pull request description with `gh pr create --attach` / `gh pr edit --attach` (`gh` 2.99+, github.com and GHE Cloud, needs push access). The resulting `user-attachments` URLs inherit the repo's visibility, so images render in private repos as well, and nothing is added to the repo: no extra branch, no files in the PR diff.

An earlier version of this ADR assumed GitHub had no command-line way to upload images and stored them on a `tracetrail-assets` branch, linked by raw URL. That branch was rejected once `--attach` existed: raw URLs do not work for private repos, concurrent PRs need push-retry handling, and agent sandboxes often may not push a second branch.

If `gh` is older than 2.99 or the upload fails, the PR gets no image; the skill does not fall back to another host. The trace file and trail spec that produced each image go into the PR description in a collapsed `<details>` block, so the image can be re-rendered later without recreating the trace. CI artifacts and committing into the PR branch remain rejected (they do not render inline and pollute the diff, respectively).

Verified from documentation only; running `gh --attach` in a real agent environment is still open (see issue 6).
