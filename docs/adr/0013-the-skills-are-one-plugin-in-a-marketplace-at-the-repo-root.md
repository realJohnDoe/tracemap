# The skills are one plugin in a marketplace at the repo root

The repo root is a Claude Code plugin marketplace (`.claude-plugin/marketplace.json`, named `tracemap`) that lists one plugin, `tracemap`, whose root is `skills/` (`skills/.claude-plugin/plugin.json` with `"skills": "./"`). Users install both skills with `/plugin marketplace add realJohnDoe/tracemap` and `/plugin install tracemap@tracemap`; they then appear as `tracemap:tracemap-images` and `tracemap:tracemap-pr`.

The plugin has no `version`, so Claude Code versions it by commit and every merge to `main` reaches users on their next update. Releases (semantic-release) only version the CLI; a hand-kept plugin version would drift from them. The skills call the published CLI with a pinned major (`@1`), so a skill change that needs a new CLI still waits for that release (see CONTRIBUTING).

The skills stay where they were, so `.claude/skills/` links and copying them into another repo keep working. Bundled scripts are referenced as `${CLAUDE_SKILL_DIR}/scripts/…`, because a plugin is installed into a cache outside the user's repo, where `skills/tracemap-pr/scripts/` does not exist.

Rejected alternatives:

- **The repo root as the plugin**: would copy the whole monorepo (apps, packages, lockfile) into every user's plugin cache.
- **Moving the skills into `plugins/tracemap/skills/`**: breaks existing paths and links for no gain over pointing the plugin at `skills/`.
- **One plugin per skill**: `tracemap-pr` needs `tracemap-images`, so they ship together.
