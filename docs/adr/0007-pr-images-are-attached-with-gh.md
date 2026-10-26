# PR images are attached with `gh --attach`

The skill puts trace maps into a pull request description with `gh pr create --attach` / `gh pr edit --attach` (`gh` 2.99+, github.com and GHE Cloud, needs push access). The resulting `user-attachments` URLs inherit the repo's visibility, so images render in private repos as well.

The skill never commits images to the PR branch. Trace files and trace map specs are not kept, so an image is re-made by producing a new trace, not by re-rendering a stored one.

## Fallback: the `tracemap-assets` branch

Uploads are not possible everywhere. In Claude Code cloud sessions a proxy adds GitHub credentials but blocks GraphQL (which `gh pr edit` needs) and accepts only JSON request bodies, so the image bytes cannot be sent by any tool. The `GITHUB_TOKEN` of a GitHub Actions workflow is refused by the upload endpoint as well (findings on issue 14).

Where `gh` cannot upload, the skill commits the images to `pr-<n>/` on a `tracemap-assets` branch in the target repo and links them as `https://github.com/<owner>/<repo>/raw/<commit>/pr-<n>/<file>`. A re-run replaces that PR's folder, and because the link names the commit, GitHub never shows a cached old image. Pushes are retried when another PR pushed in between. Only images are stored, not traces or specs. The branch is written with git plumbing, so the working tree and current branch are untouched.

GitHub leaves these `github.com` links unproxied, so the viewer's browser loads them with its own login. That should make them render in private repos for anyone who can see the PR; this is not yet verified.

Rejected alternatives:

- **The assets branch as the only route**: needs push access to a second branch, which some sandboxes forbid, and grows the repo; uploads avoid both where they work.
- **Committing images into the PR branch**: pollutes the diff and ends up in the base branch.
- **CI artifacts**: do not render inline.
- **A workflow that uploads with `GITHUB_TOKEN`**: the upload endpoint refuses that token; it would need a personal token stored as a secret in every repo.
- **An external image host or a hosted upload service**: another account or a server to run (ADR-0001), and images of private repos would leave GitHub.

If neither route works, the PR gets no image.
