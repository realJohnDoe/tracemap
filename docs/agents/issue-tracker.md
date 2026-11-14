# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues in `realJohnDoe/tracemap`. Use the `gh` CLI for all operations. In sessions without `gh` (for example Claude Code on the web), use the equivalent GitHub MCP tools (`issue_write`, `issue_read`, `list_issues`, `sub_issue_write`, …); the conventions below are the same.

## Conventions

Label, order and structure every issue as the workshop plugin's `issue-conventions` skill says, which also covers blocked-by edges and sub-issues. Everything else is plain `gh issue …`, run inside the clone so `gh` infers the repo.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --json number,title,body,labels,comments`.
