# PR images are attached with `gh --attach`

The skill puts trail images into a pull request description with `gh pr create --attach` / `gh pr edit --attach` (`gh` 2.99+, github.com and GHE Cloud, needs push access). The resulting `user-attachments` URLs inherit the repo's visibility, so images render in private repos as well.

The skill stores nothing else, and in particular **never creates or pushes a branch** (no assets branch, no orphan branch) and never commits files to the target repository. The image is the only artifact: trace files and trail specs are not kept, so an image is re-made by producing a new trace, not by re-rendering a stored one.

Rejected alternatives:

- **An assets branch** holding images, trace files and trail specs, linked by raw URL: raw URLs do not work in private repos, concurrent PRs need push-retry handling, agent sandboxes often may not push a second branch, and the stored inputs are not needed.
- **Committing images into the PR branch**: pollutes the diff.
- **CI artifacts**: do not render inline.

If `gh` is older than 2.99 or the upload fails, the PR gets no image; there is no fallback.

Verified from documentation only; running `gh --attach` in a real agent environment is still open (see issue 6).
