# Claude Code Commands & Skills Mastery
### Turn Claude Code From a Chat Window Into Your Own Custom Toolkit

Most people who use Claude Code type a request, get an answer, and move on. That works fine for one-off tasks. But Claude Code has a deeper layer underneath that most users — including a lot of working developers — never touch: a real system for turning anything you do more than twice into a permanent, reusable command with your own name on it.

This guide teaches that layer. No fluff, no padding — by the end, you'll have built real, working commands of your own, and you'll understand exactly how the pieces fit together.

---

## Part 1: The Big Picture

### 1.1 — What you're actually building

Every time you type `/something` in Claude Code — `/help`, `/compact`, `/review` — you're invoking a **command**. Some commands are built into Claude Code itself. Others, the ones this guide is about, are ones *you* write. The moment you write your own, Claude Code stops being a generic assistant and starts being a tool shaped around exactly how you work.

### 1.2 — Two names, one system

You'll see two terms used for this: "custom commands" and "skills." Here's the part most explanations skip: **these used to be two separate things, and they were recently merged into one system.** A plain instruction file and a full "skill" folder both create the exact same kind of `/your-command` — they're not competing systems, one is just the newer, more capable version of the other.

- The simple version: a single markdown file with instructions.
- The fuller version: a folder with a main instructions file (called `SKILL.md`) plus, optionally, extra reference files, templates, and even scripts Claude can run.

You don't have to pick a side. Start with the simple version. Upgrade to a full skill folder the moment you need supporting files. Either one becomes a real, working `/command`.

### 1.3 — Why this matters for how you actually use Claude

If you find yourself pasting the same paragraph of instructions into Claude Code over and over — "review this the way I like," "write a commit message in our team's format," "summarize today's changes" — that's the exact signal to build a command. The work of writing the instructions only happens once. After that, it's one word.

---

## Part 2: Your First Command, Start to Finish

We're going to build something genuinely useful: a command that writes a clean, properly-formatted commit message by actually looking at your real uncommitted changes — not guessing from memory, but reading the live diff.

### 2.1 — Where it lives

Commands/skills live in a `.claude` folder. Two locations, two different scopes:

| Where you save it | Path | Who can use it |
|---|---|---|
| Just this one project | `.claude/skills/<name>/SKILL.md` | Only this project |
| Every project you work in | `~/.claude/skills/<name>/SKILL.md` | All your projects |

For a commit-message helper, the personal (every-project) location makes sense — you write commits in every project.

### 2.2 — Create the folder

```
mkdir -p ~/.claude/skills/commit-message
```

The folder name becomes the command name. This folder means you'll type `/commit-message`.

### 2.3 — Write the instructions file

Save this as `~/.claude/skills/commit-message/SKILL.md`:

```yaml
---
description: Writes a commit message for the currently staged changes, based on the real diff.
disable-model-invocation: true
---

## Staged changes
!`git diff --staged`

## Instructions

Read the diff above and write a single commit message:
- First line: a short summary, under 65 characters, written in the imperative mood ("Add", not "Added")
- If the change genuinely needs more explanation, add a blank line and 1-3 bullet points after the summary — otherwise just the one line is fine
- Never describe what files changed if the diff already makes that obvious — describe WHY the change happened
- If the diff is empty, say plainly that there's nothing staged yet
```

### 2.4 — What just happened

Two things in that file are doing real work:

1. **The frontmatter** (between the `---` lines) — `description` tells Claude what this does, and `disable-model-invocation: true` means *only you* can trigger it by typing `/commit-message`. Claude will never decide to run it on its own. That matters here — you don't want Claude writing commit messages unprompted.
2. **The `` !`git diff --staged` `` line** — this is the single most useful trick in this whole system. Anything wrapped in backticks with a `!` in front of it actually *runs* as a real command on your computer before Claude ever sees the file. The output — your real, live, staged diff — gets substituted in right there. Claude isn't guessing what you changed. It's reading exactly what you changed, every single time you run this.

### 2.5 — Try it

Stage a real change (`git add` something), then in Claude Code type:

```
/commit-message
```

You'll get a commit message written from your actual diff, not a generic placeholder.

---

## Part 3: The Frontmatter Fields Worth Actually Knowing

The frontmatter block is where you configure *how* a command behaves. Most guides dump the entire field list on you at once. Here's the version that actually matters, grouped by what problem each one solves:

**"Who's allowed to run this?"**
- `disable-model-invocation: true` — only you, by typing the command. Use this for anything with a real side effect: deploying, sending a message, committing code. You don't want Claude deciding the timing on its own.
- `user-invocable: false` — the opposite. Only Claude can use it, and it won't show up if you type `/`. Good for background knowledge Claude should know about but that isn't really an action you'd take, like "here's how our billing system works."
- Leave both off, and either of you can trigger it — Claude automatically, when your request matches the `description`, or you directly by typing the name.

**"What can it touch without asking permission?"**
- `allowed-tools: Bash(git add *) Bash(git commit *)` — pre-approves exactly those operations while this command is running, so you're not clicking "approve" on every single step. Be specific. Don't write a blanket allow if a narrow one will do.

**"Does it need information from me when I run it?"**
- `argument-hint: [issue-number]` — shown to you as a hint when you start typing the command, so you remember what to type after it.
- Inside the instructions body, `$ARGUMENTS` becomes whatever you typed after the command name. Type `/fix-issue 412` and `$ARGUMENTS` becomes `412`.

**"What if I need more than one piece of input?"**
- `$0`, `$1`, `$2`... grab arguments by position. `/migrate-component SearchBar Vue` — `$0` is `SearchBar`, `$1` is `Vue`.
- Or name them: add `arguments: [component, framework]` to the frontmatter, then write `$component` and `$framework` directly in your instructions — much easier to read back later than `$0`/`$1`.

That's genuinely the list that covers the vast majority of real use. Everything else is a refinement you'll discover naturally once you're using these regularly.

---

## Part 4: Five Original Commands You Can Use Today

These are built from scratch for this guide — copy any of them in directly, or use them as a starting template for your own.

### 4.1 — Weekly Progress Note

For anyone tracking their own work week to week, not just developers.

```
mkdir -p ~/.claude/skills/weekly-note
```

`~/.claude/skills/weekly-note/SKILL.md`:
```yaml
---
description: Turns a rough list of what I did this week into a clean, readable progress note.
disable-model-invocation: true
---

I'm going to paste a messy, unstructured list of what I worked on this week.

Turn it into:
1. A short 2-sentence overview of the week
2. A bulleted list of concrete things accomplished, grouped by theme if there are more than 5
3. One line on what's planned for next week, if I mention it

Keep my actual voice and details — don't invent accomplishments or pad it with corporate language.
```

### 4.2 — Decision Log Entry

Useful any time you're making a call you might want to remember the reasoning behind later.

`~/.claude/skills/log-decision/SKILL.md`:
```yaml
---
description: Records a decision with the reasoning behind it, for future reference.
disable-model-invocation: true
arguments: [decision]
---

Today's date: !`date +%Y-%m-%d`

I'm making this decision: $decision

Ask me exactly two follow-up questions to capture the real reasoning (not generic ones — tailor them to what I actually said), then write a short, dated log entry: the decision, the reasoning, and what would have to change for me to revisit it.
```

### 4.3 — Explain Like I'm Catching Up

For picking back up a project (or a codebase) after time away.

`~/.claude/skills/catch-me-up/SKILL.md`:
```yaml
---
description: Summarizes recent activity in this project so I can pick back up after time away.
context: fork
agent: Explore
---

Look at the last 10 commits and the current state of this project. Summarize:
1. What's actually changed recently, in plain language
2. Anything that looks unfinished or like it was a work in progress
3. The single most useful next thing to do

I've been away from this project for a while — assume I need the full picture, not a quick reminder.
```

Notice the `context: fork` and `agent: Explore` here — this runs the whole investigation in a separate, read-only research assistant instead of cluttering your main conversation with file reads. More on exactly what that means in Part 5.

### 4.4 — Research Brief

For anything that needs digging before you can act on it.

`~/.claude/skills/research/SKILL.md`:
```yaml
---
description: Researches a topic thoroughly and returns a structured brief.
context: fork
agent: Explore
disable-model-invocation: true
---

Research the following thoroughly: $ARGUMENTS

Return a structured brief:
1. The short answer, up front
2. The supporting detail
3. Anything genuinely uncertain or that needs a second look
4. Sources or files referenced, if applicable
```

### 4.5 — The "Don't Let Me Ship This" Pre-Flight Check

A pre-commit sanity pass, written to actually catch things rather than just rubber-stamp.

`~/.claude/skills/preflight/SKILL.md`:
```yaml
---
description: Checks uncommitted changes for real issues before I commit — not a style nitpick pass.
disable-model-invocation: true
---

## Current changes
!`git diff HEAD`

## Instructions

Review the diff above for:
1. Anything that looks like a real bug, not just a style preference
2. Hardcoded values that probably shouldn't be hardcoded (secrets, URLs, magic numbers)
3. Anything removed that might have been load-bearing (error handling, a check, a comment explaining a workaround)

Be direct about severity — "this will break in production" reads very differently from "minor, your call." If nothing's wrong, say so plainly instead of inventing a nitpick to seem thorough.
```

---

## Part 5: Subagents — Giving a Task Its Own Clean Workspace

### 5.1 — The problem this solves

Say you ask Claude to research how a feature works across a large codebase. Without subagents, every file it reads, every search result, every dead end — all of it piles up in your main conversation. By the time you actually get to the real work, your conversation is full of search noise you'll never look at again.

A subagent solves this by doing that exploration in its *own* separate workspace, and handing you back only the summary. Your main conversation stays clean.

### 5.2 — The three you get for free

Claude Code already ships with three subagents, used automatically when appropriate:

- **Explore** — fast, read-only, can't edit anything. Used for searching and understanding code without touching it.
- **Plan** — used specifically while you're in planning mode, gathering context before proposing an approach.
- **General-purpose** — the one that can both investigate *and* make changes, for anything that needs both.

You don't have to invoke these by name most of the time — Claude reaches for the right one automatically when a task fits.

### 5.3 — When to build your own

Build a custom subagent when you find yourself asking for the *same kind* of specialized work repeatedly — always with the same constraints, the same tone, the same narrow toolset. A few genuinely useful examples:

- A subagent that's only allowed to read files and search, never edit — for a second opinion you trust not to "fix" anything while looking.
- A subagent with a strict, specific persona — "you only flag security issues, nothing else" — so it doesn't drift into general code review when you specifically wanted one narrow lens.
- A subagent pinned to a cheaper/faster model for simple, repetitive checks where the full model is overkill.

### 5.4 — How skills and subagents combine

This is the part that ties Parts 2-4 together with Part 5: a skill can be set to run inside its own subagent instead of your main conversation, with `context: fork`. You saw this already in the "Catch Me Up" and "Research Brief" commands above — that's exactly what `context: fork` + `agent: Explore` was doing. The skill's instructions become the task handed to a fresh, isolated assistant, and only the result comes back to you.

The rule of thumb: if a command involves digging through a lot of files or output you won't personally need to see, fork it. If it's a quick, direct task, leave it in your main conversation.

---

## Part 6: Troubleshooting — What Actually Goes Wrong

**"My command isn't showing up when I type `/`."** Check the folder structure — it needs to be `<name>/SKILL.md` inside `.claude/skills/`, not just a loose file. The folder name is what becomes the command.

**"Claude isn't using it automatically, even though I didn't restrict it."** Your `description` is probably too vague. "Helps with commits" tells Claude almost nothing. "Writes a commit message based on the actual staged diff, formatted with a short summary line" gives it something concrete to match against your request.

**"It's triggering when I don't want it to."** Tighten the description, or just add `disable-model-invocation: true` and trigger it manually every time instead.

**"I added a brand new top-level skills folder mid-session and it's not picking up."** Editing an *existing* skill takes effect immediately. Adding a folder that didn't exist when you started the session needs a restart so Claude Code knows to watch it.

---

## Closing

The actual skill here isn't memorizing every frontmatter field — it's noticing the pattern: *anything you explain to Claude more than twice belongs in a file, not in your fingers.* Every command in Part 4 started as something somebody would otherwise type out fresh, every single time. Build the habit of catching that moment, and your setup keeps getting more useful the longer you use it — which is exactly the opposite of how most tools work.
