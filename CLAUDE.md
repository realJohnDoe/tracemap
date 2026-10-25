# CLAUDE.md

- When you finish work on a feature branch, always open a pull request against `main` if none exists yet for that branch. Check for an existing PR first, and use the repo's PR template if there is one.

## Trail images on PRs

After opening a pull request here, or pushing changes to one, use the `pr-trail-images` skill (`skills/pr-trail-images/`, linked into `.claude/skills/`) to add or refresh trail images in its description. The skill decides whether images help; if `gh` is older than 2.99 or not authenticated, skip it and say so in your reply.

## Design docs

Read `GLOSSARY.md` and the ADRs in `docs/adr/` before changing behaviour, and use the glossary's terms in code, issues and CLI flags.

## Agent skills

This repo is set up for [Matt Pocock's engineering skills](https://github.com/mattpocock/skills).

### Issue tracker

Issues live in GitHub Issues on `realJohnDoe/tracetrail`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the root. See `docs/agents/domain.md`.
