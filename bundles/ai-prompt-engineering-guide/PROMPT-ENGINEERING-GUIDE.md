# AI Prompt Engineering Guide — Advanced Technique for Claude

This guide goes past "write a clear prompt" advice into the structural techniques that actually change output quality — the same patterns experienced Claude users rely on daily. Every technique below comes with a real, ready-to-adapt template.

If you get stuck, email **support@claudecraft.ca**.

---

## Part 1: The Four-Part Structure (RTCF)

Most disappointing responses come from under-specifying, not from the model being "bad." Before anything fancier, make sure every serious prompt has these four parts:

- **Role** — who should Claude act as for this task?
- **Task** — exactly what do you want done?
- **Context** — the specific details that make this YOUR situation, not a generic one
- **Format** — how should the output look?

```
Act as [role]. I need you to [specific task]. Here's the context that matters: [details specific to your situation]. Format the output as [exact format — bullet list, table, email, etc.].
```

Skipping any one of these four is the single most common reason a prompt underperforms.

---

## Part 2: Iterative Refinement Over Restarting

When a response isn't quite right, don't start a new conversation — correct course within the same one. Claude retains context, so each correction compounds instead of starting from zero.

```
Good direction, but: [specific thing to change — shorter, less formal, more examples, different angle]. Keep everything else the same.
```

For anything you'll iterate on repeatedly (a recurring report, a content format), set this up once as a Project with Custom Instructions instead of re-explaining every time.

---

## Part 3: Multi-Step Prompt Chains

Complex tasks done in one giant prompt tend to produce shallow results across the board. Breaking the same task into sequential, dependent steps consistently produces deeper output at each stage.

**Chain example — research-to-output:**
```
Step 1: List the 5 most important sub-questions I'd need answered to fully understand [topic].
[wait for response]
Step 2: Answer sub-question #[N] in depth, with concrete examples.
[repeat for each sub-question]
Step 3: Now synthesize everything above into [final format — a report, a plan, a script].
```

This works because each step gets Claude's full attention on a narrower problem, rather than diluting effort across an entire task at once.

**Chain example — draft-critique-revise:**
```
Step 1: Write a first draft of [thing].
Step 2: Now critique your own draft as a skeptical expert in this field would — be genuinely harsh, find real weaknesses.
Step 3: Rewrite incorporating every valid criticism from Step 2.
```

Self-critique chains like this reliably outperform a single best-effort attempt, because the critique step surfaces issues a single pass never catches.

---

## Part 4: Constraint and Perspective Techniques

**The steelman-then-decide:**
```
I'm deciding between [option A] and [option B]. Steelman the case FOR each as strongly as a true believer would, then steelman the case AGAINST each the same way. Only after all four steelmans, give your actual recommendation.
```

**The first-principles rebuild:**
```
Ignore how [thing] is conventionally done. If you designed a solution to [the underlying problem] from first principles, with no reference to existing approaches, what would you build? Then compare it honestly to the conventional approach.
```

**The audience triangulation:**
```
Rewrite this for three different audiences without changing the core message: a total beginner, a skeptical expert, and a busy executive with 30 seconds. Make each version genuinely fit its audience.

[paste your content]
```

---

## Part 5: Prompt Engineering for Agentic Workflows

When Claude is doing multi-step work on your behalf (using tools, taking actions, working across files), the structure shifts from "ask a question" to "define a process with checkpoints."

```
Your task: [the overall goal]. Work through it in clearly labeled steps. After each step, summarize what you did and what's next before continuing — don't silently jump ahead. If you hit a decision point with real tradeoffs, stop and ask me rather than guessing.
```

This single pattern — explicit steps, summarize-before-continuing, stop at real decision points — is the difference between an agentic workflow you can trust and one that quietly goes off the rails three steps in.

---

## Part 6: Common Mistakes That Quietly Tank Output Quality

1. **Re-explaining context every message** instead of setting it once via a Project's Custom Instructions.
2. **Asking for "the best" version of something** instead of specifying the actual criteria that make a version good for your situation.
3. **One giant prompt for a multi-stage task** instead of a chain (see Part 3).
4. **Accepting the first draft** instead of running a critique pass (see Part 3's draft-critique-revise chain).
5. **Vague format requests** ("make it good") instead of an exact format spec ("3 bullet points, each under 15 words").

---

Want this kind of structure pre-built into ready-to-paste setups for specific real-life situations instead of building your own from scratch? Browse the full catalog of done-for-you bundles at https://claudecraft.ca.
