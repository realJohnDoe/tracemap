# Triage Labels

The workshop's labels (model tiers, `ready-for-agent`, `deferred`, `automerge`) and the `## Decision needed` section follow the `issue-conventions` skill of the [workshop plugin](https://github.com/realJohnDoe/agent-skills/blob/main/skills/issue-conventions/SKILL.md). This repo also keeps the default triage vocabulary of mattpocock/skills as real labels:

| Label in mattpocock/skills | Label in our tracker | Meaning                                                                 |
| -------------------------- | -------------------- | ----------------------------------------------------------------------- |
| `needs-triage`             | `needs-triage`       | Not yet approved by the maintainer; every ticket an agent files gets it |
| `needs-info`               | `needs-info`         | Waiting on the reporter for more information                            |
| `ready-for-agent`          | `ready-for-agent`    | The maintainer's go-ahead; set only by the maintainer                   |
| `ready-for-human`          | `ready-for-human`    | Human-only work (accounts, secrets, taste); no tier label               |
| `wontfix`                  | `wontfix`            | Will not be actioned                                                    |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label from this table, except `ready-for-agent`, which only the maintainer adds.
