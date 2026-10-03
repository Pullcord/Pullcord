---
name: claude-antigravity-setup
description: >
  How to configure a Claude Code + Antigravity session for a project —
  CLAUDE.md/AGENTS.md structure, memory, Skills, hooks, context limits, and
  token cost. Use when starting a new project or folder, when CLAUDE.md is
  getting long, when a session hits context/compaction limits, when deciding
  whether something should be a Skill vs. a hook vs. inline CLAUDE.md content,
  when resuming a session with `--continue`, when pasting an image or
  screenshot, when about to publish a PR, issue, or comment on GitHub, or when
  about to use the Google Drive MCP tools.
allowed-tools: [Read, Edit, Write, Grep, Glob, Bash]
---

# Setting up a project for Claude Code + Antigravity

This is the checklist to execute, not the research behind it.

## Do this for every project, from the start, not after it grows

1. **Create `CLAUDE.md` at the project root, and keep it under ~200 lines.**
   Hard rules that always apply go here. Everything else (history, one-off
   decisions, reference material) goes in its own file, linked, not pasted.
2. **Create `AGENTS.md` at the root with the same hard rules**, and put
   `@AGENTS.md` as the first line of `CLAUDE.md` so it imports automatically.
   Both tools then read one source. Don't depend on either tool reading the
   other's file on its own.
3. **Keep memory outside the project folder** if the project spans sessions.
   Memory that lives in the repo can end up in a public history.
4. **Before writing a new Skill, check whether a hook fits better.** If something
   must never be skipped (a secret scan before a commit, a license check), it
   belongs in a hook (`.claude/hooks/` or `settings.json`). Skills load only when
   the model judges them relevant; hooks run every time their event fires.
5. **Include only the files a task needs**, not whole directories. Fewer files
   loaded means fewer tokens for the same output quality.
6. **Run `/compact` at the end of a discrete sub-task** instead of waiting for
   auto-compaction. Use `/recap` when resuming after a break.
7. **Run an end-of-session check** if the project has one (a command or a
   checklist). It audits CLAUDE.md, AGENTS.md, Skills and memory separately against
   each file's purpose, and accepts "nothing needed" as a valid answer.
8. **Resuming with `claude --continue`.** It reloads the whole conversation by
   design, so the saving comes from not re-reading or re-verifying what is
   already in context. Rule for AGENTS.md: answer directly from what is
   established in the session; re-verify only what changed or what is date-bound.
9. **Zero hallucination, verify fresh.** Anything that depends on a date (versions,
   prices, platform rules, legal deadlines, protocol upgrades) gets checked live,
   never asserted from training memory. "I don't know, let's verify" is an
   allowed answer. Add this rule to AGENTS.md.
10. **Images cost tokens by area, not file size.** Image token cost scales with
    width and height in 28-pixel blocks, so crop a screenshot to the relevant
    area before pasting. Compressing the file does not reduce tokens. Batch
    related screenshots into one turn: each new image invalidates the prompt
    cache from that point on, so pasting them one per turn forces repeated
    rewrites. Add this rule to AGENTS.md.
11. **GitHub writing.** Every PR, issue or comment is humanized and concise,
    keeps the AI co-authorship trailer visible, and proposes a fix (not only a
    report) once the root cause is confirmed with real evidence. Never propose a
    fix for an unconfirmed cause. Add this rule to AGENTS.md.
12. **Google Drive MCP is not the default reader.** For a Doc/Sheet/Slide, first
    ask the user to paste the content, or WebFetch it if it is public. Use the
    MCP only to verify private content that is about to go external. Add this
    rule to AGENTS.md.

## Quick answers to the questions this skill gets asked most

- **"Does a new session remember everything automatically?"** Only `CLAUDE.md`
  (in full, every session) and the external memory index load without being
  asked. A Skill's full body, or any file linked from `CLAUDE.md`, does not.
- **"Is SKILL.md a Claude Code thing or an Antigravity thing?"** Both: the same
  folder-plus-`SKILL.md`-plus-YAML-frontmatter format. Write one and it works in
  either.
- **"What's the real context limit?"** Check the current plan's limit with
  `/status` or the official docs before quoting a number. Do not quote one from
  memory.

## When to update this skill

Update this file only when the actionable process changes, not when a number
behind it changes. Keep the research behind the checklist in your own notes; it
is not part of the repo.
