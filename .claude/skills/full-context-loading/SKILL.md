---
name: full-context-loading
description: >
  How every answer in this project should already reflect the full
  stack of available context — this project's CLAUDE.md/AGENTS.md,
  persistent memory, this project's own hand-built skills, Claude's
  global skills, and any installed community/network skill packages —
  without re-reading everything on every turn or bloating token usage.
  Covers what already loads automatically for free, what the actual
  discipline fix is (checking what exists before answering from
  scratch), what NOT to do (force full preload of every skill body),
  and a live inventory of what exists in this project so a fresh
  session doesn't have to rediscover it. Use at the start of a new
  session, when asked "do you have full context," or whenever an
  answer risks being generic instead of grounded in what this project
  already knows.
---

# Full context loading — every answer grounded, without re-reading everything

## What already loads automatically, every session, at zero extra cost

No action needed for these — verify they're actually true for this
project, then treat them as given:

- **`CLAUDE.md` (and any file it imports, e.g. `AGENTS.md`)** — injected
  as project instructions automatically at session start. This is where
  this project's hard rules and file map should already live.
- **The persistent memory system**, if this project has one — its
  index file (commonly `MEMORY.md`) loads automatically every session;
  the full content of any individual memory entry loads only when
  read. Check the index before answering something it might already
  cover — don't re-derive a fact memory already has.
- **Every installed Skill's name + description** — Claude Code shows
  this list automatically at session start, at a cost of tens of tokens
  per skill. The **full body** of a skill loads only when a task
  matches its description (via the `Skill` tool) or is loaded here
  explicitly. **This is already the token-saving mechanism this project
  needs — it does not need to be rebuilt.**

## The real fix: actively check before answering, don't wait to be told

The gap this skill exists to close isn't a missing preload — it's a
session answering a non-trivial request as if none of the above
existed, when a quick check would have surfaced something directly
relevant. Before answering anything beyond a trivial or purely
conversational request, run this check:

1. **Does an available Skill's description match this task?** If yes,
   invoke it (`Skill` tool) instead of reasoning from scratch what it
   already documents.
2. **Does this project's memory index name something relevant?** Read
   that entry before asserting a fact "from nothing" — a past
   correction, a verified figure, a standing decision may already be
   there.
3. **Does a playbook or reusable-process doc this project actually
   has** (only if one exists — don't assume a `playbooks/` folder
   exists just because another project has one) **already cover this
   kind of task?**
4. **Is there a community/network skill package installed** that's more
   current than what's in memory or in a hand-built skill? Skill
   packages get updated independently of this project's own memory.

This is a discipline to apply every time, not a one-time setup step —
don't answer from a blank slate what an already-available resource
already covers.

## What NOT to do — don't force full preload

Loading every skill's entire body and every memory entry into context
on every session start would cost real tokens for content irrelevant
to most requests — this directly fights the goal of not wasting
tokens, not serves it. The name+description-only preload already IS
the correct mechanism for exactly this tradeoff: cheap awareness that
something exists, full cost only when it's actually used. Don't try to
route around it by dumping full content somewhere it'll be re-read
every turn.

## Inventory: what exists in THIS project

Public (in the repo, a clone has them):
- `.claude/skills/`: `public-claim-verify`, `doc-accuracy-audit`,
  `claude-antigravity-setup`, `full-context-loading` (this one),
  `hackathon-fit-check`, `grants-track-record`.
- `AGENTS.md` (hard rules), `CLAUDE.md` (map), `.mcp.json` (Raven MCP).

Local only (in this machine, NOT in the repo, a clone does not have them):
- `.claude/skills/`: `teammate-commit-identity`, `mexico-legal-check`,
  `ecosystem-skills-installer`, `repo-security-sweep`.
- `playbooks/`: the team's research and process notes.

Do not cite a local-only file from a public file. If an answer needs one, say
it is local.

- **Claude's global skills** (`~/.claude/skills/`, `~/.agents/skills/`): not
  assumed to belong to this project. Check the description before relying on
  one.
- **Persistent memory**: outside the repo, at
  `~/.claude/projects/-home-vaiosvaios-Pullcord/memory/`, indexed by `MEMORY.md`.

**Verify your `.gitignore` isn't silently hiding your `SKILL.md` files
from git — a real bug found in an earlier project: a
broad `*.md` rule excluded almost every skill from version control, so
none would survive a fresh clone or a machine change. Confirm with
`git ls-files` or `git check-ignore -v <path>` on each real `SKILL.md`
— don't just read `.gitignore` and assume nothing wide is in it.** A
deliberate, narrower exclusion (a private folder kept out of a public
repo on purpose, one identity-sensitive skill excluded by exact path)
is a different, legitimate case — the test is whether tracking matches
what you actually intended.

## Related

`claude-antigravity-setup` (configuración inicial del proyecto; esta skill es el
complemento de disciplina continua).
