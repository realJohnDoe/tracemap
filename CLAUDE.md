# CLAUDE.md

## Commits and releases

Every merge to `main` is released by semantic-release from Conventional Commit messages (`feat:` is a minor, `fix:` a patch, `feat!:` or a `BREAKING CHANGE:` footer a major; `docs:`, `chore:`, `test:` and `ci:` do not release). PRs are squash-merged, so the PR title becomes the commit message, and the `PR title` check fails any title that is not `type: subject` (or `type(scope): subject`) with one of the types above or `refactor:`, `perf:`, `build:`, `style:`, `revert:`. Set the title in that form when you open the PR (for example `docs: point links at the renamed repository`), not afterwards, and keep it up to date if the PR's purpose changes. Never edit the version in `packages/cli/package.json`; it is a placeholder.

## Design docs

Read `GLOSSARY.md` and the ADRs in `docs/adr/` before changing behaviour, and use the glossary's terms in code, issues and CLI flags.

## Agent skills

This repo is set up for [Matt Pocock's engineering skills](https://github.com/mattpocock/skills).

### Issue tracker

Issues live in GitHub Issues on `realJohnDoe/tracemap`. See `docs/agents/issue-tracker.md`.

### Triage labels

Before creating, labelling or ordering an issue, or opening a PR, follow the workshop plugin's `conventions` skill: it covers when to open a PR and adding trace maps to it with `tracemap-pr` (here, the working copy in `skills/tracemap-pr/`, linked into `.claude/skills/`). This repo's extra triage labels are in `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the root. See `docs/agents/domain.md`.
