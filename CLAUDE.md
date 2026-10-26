# CLAUDE.md

- When you finish work on a feature branch, always open a pull request against `main` if none exists yet for that branch. Check for an existing PR first, and use the repo's PR template if there is one.

## Commits and releases

Every merge to `main` is released by semantic-release from Conventional Commit messages (`feat:` is a minor, `fix:` a patch, `feat!:` or a `BREAKING CHANGE:` footer a major; `docs:`, `chore:`, `test:` and `ci:` do not release). Write PR titles in that form, since PRs are squash-merged. Never edit the version in `packages/cli/package.json`; it is a placeholder.

## Trace Map on PRs

After opening a pull request here, or pushing changes to one, use the `tracemap-pr` skill (`skills/tracemap-pr/`, linked into `.claude/skills/`) to add or refresh trace maps in its description. The skill decides whether images help and how they reach the PR; if it cannot attach them, say so in your reply.

## Design docs

Read `GLOSSARY.md` and the ADRs in `docs/adr/` before changing behaviour, and use the glossary's terms in code, issues and CLI flags.

## Agent skills

This repo is set up for [Matt Pocock's engineering skills](https://github.com/mattpocock/skills).

### Issue tracker

Issues live in GitHub Issues on `realJohnDoe/tracemap`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the root. See `docs/agents/domain.md`.
