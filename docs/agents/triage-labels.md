# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the "Label in our tracker" column to match whatever vocabulary you actually use.

## Implementer labels

Every ticket also carries exactly one label saying who should pick it up: a model tier, or `ready-for-human`. These are the [workshop](https://github.com/realJohnDoe/agent-skills)'s labels: it dispatches every unblocked `haiku`, `sonnet` or `opus` ticket that also has `ready-for-agent` to an agent session.

| Label               | Meaning                                                                    |
| ------------------- | -------------------------------------------------------------------------- |
| `opus`              | Agent-ready, but design-heavy or needs judgement: use the strongest model  |
| `sonnet`            | Agent-ready and well specified: mechanical or follows settled decisions    |
| `haiku`             | Agent-ready and trivial: a one-line or purely mechanical change            |

Human-only work (accounts, secrets, taste) gets `ready-for-human` and no tier. `ready-for-agent` is the maintainer's go-ahead: agents never add it, so a ticket an agent files with `opus`, `sonnet` or `haiku` gets `needs-triage` instead and waits under the workshop digest's Waiting on you until the maintainer approves it.

When the maintainer must decide something before work starts, the ticket says so in a `## Decision needed` section of its body: the question first, then the options. The digest lists it with its question until the section has a `Decided:` line or the ticket gets `ready-for-agent`. There is no label for it.
