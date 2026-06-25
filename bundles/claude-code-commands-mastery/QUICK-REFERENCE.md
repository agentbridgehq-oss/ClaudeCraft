# Claude Code Commands & Skills — Quick Reference Card

Keep this open while you build. The full guide explains the *why* — this is the fast lookup for the *how*.

---

## Folder structure

```
~/.claude/skills/<command-name>/SKILL.md     ← works in every project
.claude/skills/<command-name>/SKILL.md       ← this project only
```

The folder name is the command name. `commit-message/` → `/commit-message`.

## The minimal file

```yaml
---
description: One sentence on what this does and when to use it.
---

Your instructions to Claude go here.
```

That's a complete, working command. Everything below is optional refinement.

## Frontmatter cheat sheet

| Field | What it does |
|---|---|
| `description` | Lets Claude match your requests to this command automatically. Be specific. |
| `disable-model-invocation: true` | Only YOU can trigger it, by typing `/name`. Use for anything with a real side effect. |
| `user-invocable: false` | Only CLAUDE can trigger it — hidden from your `/` menu. For background knowledge only. |
| `allowed-tools: Bash(git add *)` | Pre-approves specific tool actions so you're not clicking "approve" every time. |
| `argument-hint: [issue-number]` | Shown to you as a typing hint. Cosmetic only. |
| `arguments: [name, branch]` | Names your positional arguments so you can write `$name`/`$branch` instead of `$0`/`$1`. |
| `context: fork` | Runs this command in its own isolated subagent instead of your main conversation. |
| `agent: Explore` | Which subagent type to use when `context: fork` is set. |

## Argument substitutions

| Write this | Get this |
|---|---|
| `$ARGUMENTS` | Everything typed after the command name, as one string |
| `$0`, `$1`, `$2` | Individual arguments by position (0-indexed) |
| `$name` | A named argument, if declared in `arguments:` frontmatter |

## Dynamic context injection (the trick worth knowing)

`` !`command` `` on its own line runs that real shell command BEFORE Claude sees the file, and substitutes the actual output in its place.

```
## Current branch
!`git branch --show-current`
```

Claude receives the real branch name, not a guess. Works for any shell command — `git diff`, `ls`, `date`, a script you wrote.

## The 5 ready-made commands from this guide

| Command | What it's for |
|---|---|
| `/commit-message` | Writes a commit message from your real staged diff |
| `/weekly-note` | Turns a messy list of what you did this week into a clean note |
| `/log-decision` | Records a decision with the reasoning, dated |
| `/catch-me-up` | Summarizes recent project activity after time away (runs in Explore) |
| `/research` | Returns a structured research brief on any topic (runs in Explore) |
| `/preflight` | Reviews uncommitted changes for real issues before you commit |

Full instructions for each are in the main guide — copy them in directly.

## Fast troubleshooting

- **Not showing up under `/`?** Check it's `<name>/SKILL.md` inside a folder, not a loose file.
- **Claude not using it automatically?** Your `description` is too vague — make it concrete.
- **Triggering when you don't want it?** Add `disable-model-invocation: true`.
- **Just added a brand-new top-level skills folder?** Restart Claude Code once so it picks up the new folder to watch.
