# Claude Power User Pack — 8 Advanced Skills

For people already comfortable with Claude who want to go further — real native Skills, token efficiency, and advanced techniques.

---

## 1. Build a Real Claude Skill (Zip Format)

**What it does:** Walks you through packaging a Custom Instructions prompt as an actual native Claude Skill (the zip + SKILL.md format). Skills now work on every plan including Free — the only requirement is Code Execution turned on.

```
You help me convert a Custom Instructions prompt into a real Claude Skill. When I give you a prompt, produce:
1. A SKILL.md file with proper frontmatter (name, description) and the instructions body
2. A note on folder structure (skill-name/SKILL.md, plus any reference files)
3. Exactly how to zip and upload it: Settings > Capabilities > turn on "Code execution and file creation" first, then Customize > Skills > + Create skill > Upload a skill

Explain any step that requires Code Execution to be enabled.
```

**Try it:** "Here's my Custom Instructions prompt for writing weekly client reports: [paste your prompt]. Package this as a real Skill."

**Why this matters:** Custom Instructions only apply inside one Project. A real Skill follows you everywhere — once it's installed, it's available in any conversation, not just the Project you built it in.

---

## 2. Token-Saving Prompt Auditor

**What it does:** Reviews your own prompts/conversations and tells you exactly where you're wasting tokens.

```
You audit my prompts for token efficiency. When I paste a prompt or conversation excerpt, identify:
1. Redundant context being re-explained that's already in the conversation
2. Requests asking for more output than needed (e.g. "explain in detail" where a summary would do)
3. A rewritten, leaner version of the same request
Be specific about WHY each change saves tokens.
```

**Try it:** "Audit this prompt: 'Can you please explain in great detail, with lots of examples, the various different ways I could possibly approach restructuring my morning routine, considering all the factors that might be relevant?'" — watch it cut the bloat while keeping the actual ask intact.

**Why this matters:** On the free plan especially, every wasted token is a wasted message. This skill pays for the whole bundle the first week you use it if you're anywhere near your usage limits.

---

## 3. Multi-Step Agentic Workflow Builder

**What it does:** Designs a Claude Project that runs a multi-step process (research → draft → revise) instead of a single-shot prompt.

```
You design multi-step Claude workflows. When I describe a complex task, break it into 3-5 discrete steps, write Custom Instructions that have Claude explicitly move through each step in order within one conversation, and tell me what to say to advance to the next step.
```

**Try it:** "I want a workflow for turning a rough blog post idea into a finished, edited post — research the topic, draft an outline, write a full draft, then do a critical self-edit pass. Build me that Project."

**Why this matters:** Most people use Claude one prompt at a time and lose the thread on anything complex. A real multi-step workflow keeps the whole process — and all the context from earlier steps — inside one coherent Project.

---

## 4. Code Review Specialist

**What it does:** A dedicated code-review persona that catches real issues, not just style nitpicks.

```
You are a senior code reviewer. When I paste code, identify: 1) actual bugs or edge cases missed 2) security concerns 3) one specific simplification opportunity. Skip style preferences unless they affect correctness. Be direct about severity.
```

**Try it:** Paste any function you're not 100% confident in — even ten lines is enough to see this skill catch something a quick self-read misses.

**Why this matters:** General-purpose Claude will often praise mediocre code to be agreeable. This skill is explicitly instructed to skip the niceties and tell you what's actually wrong, in order of how much it matters.

---

## 5. Long-Document Strategist

**What it does:** Helps you work with documents too long for one clean pass — chunking strategy, not just "paste it all in."

```
You help me work with long documents in Claude. When I describe a long document and what I need from it, tell me whether to paste it whole or split it, suggest a chunking strategy if needed, and a specific first question to ask that gets the most useful initial output.
```

**Try it:** "I have a 40-page vendor contract and need to find every clause that could let them raise prices mid-contract. How should I work through this in Claude?"

**Why this matters:** Dumping an entire long document in and hoping for the best is the #1 way people get vague, unfocused answers. This skill front-loads the strategy so your first message actually works.

---

## 6. Custom Skill Template Generator

**What it does:** Generates a clean Custom Instructions template for ANY new job, with proper structure.

```
You write Custom Instructions templates. When I describe a job in plain language, produce: a role line, 3-5 numbered behavior rules, an output format spec, and one "try it" example — formatted exactly like a finished, ready-to-use Custom Instructions block.
```

**Try it:** "I want a Custom Instructions skill that turns my rambling voice-memo transcripts into clean to-do lists. Build me that template."

**Why this matters:** This is the skill that lets you keep building new skills long after you've finished this bundle — it's the one that pays forward.

---

## 7. Prompt Do's and Don'ts Coach

**What it does:** Reviews a prompt you're about to send and flags common mistakes before you waste a message on it.

```
You review prompts before I send them. When I paste a draft prompt, tell me: 1) what's missing (Role/Task/Context/Format) 2) anything ambiguous that could cause a bad response 3) the improved version. Be quick and direct — this is a pre-flight check, not an essay.
```

**Try it:** "Check this prompt before I send it: 'write me something good for my business post.'" — see exactly how much is missing before you've burned a message finding out the hard way.

**Why this matters:** A 30-second pre-flight check here routinely saves 2-3 wasted back-and-forth messages on a vague ask.

---

## 8. Claude.ai Power-User Shortcuts Reference

**What it does:** Not a prompt — a reference sheet of genuinely useful claude.ai features power users miss.

```
Reference: Projects (persistent specialist spaces), Artifacts (separate-panel outputs you can iterate on without re-pasting), file uploads for direct document analysis, and Custom Instructions per-project. Use Projects for anything you do more than twice. Use Artifacts when building something substantial (code, long documents) so edits don't clutter the chat.
```

**Try it:** Next time Claude writes you anything longer than a paragraph — code, an essay draft, a table — ask it to put the output in an Artifact instead of the chat. Notice how much easier it is to iterate without losing the original.

**Why this matters:** Most people who've used Claude for months still haven't touched Artifacts or per-project Custom Instructions. These two features alone are the difference between using Claude and actually working with it.

---

### Quick Tips

One skill = one Claude Project. Updates free forever for bundle owners. If you build something useful with Skill #6 (the template generator), email it to **support@claudecraft.ca** — we genuinely read these, and the best ones sometimes become bonus content for everyone.
