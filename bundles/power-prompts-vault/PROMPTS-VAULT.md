# The Claude Power Prompts Vault — 50 Advanced Prompts & Multi-Step Workflows

You already know Claude can answer questions. This is the next level: 50 advanced prompts and multi-step workflows that turn single requests into orchestrated outcomes — the kind of prompting that took us years of daily use to figure out, handed to you in one file.

Unlike our SKILLS.md bundles (one skill = one dedicated Project), most of these are designed to be used **inline, in any conversation** — copy, paste, adapt the bracketed part, go. A few of the more advanced ones work best as their own Project; those are marked.

If you get stuck, email **support@claudecraft.ca**.

---

## Section 1: Multi-Step Reasoning Workflows

**1. The Pre-Mortem**
```
Before I commit to this plan, run a pre-mortem: assume it failed completely six months from now. Work backward and generate the 5 most plausible reasons it failed. Then rank them by likelihood AND by how cheap they'd be to prevent right now.

Plan: [describe it]
```

**2. The Steelman-Then-Decide**
```
I have a decision to make: [describe it]. First, steelman the case FOR each option as strongly as a true believer would. Then steelman the case AGAINST each option the same way. Only after both steelmans are complete, give me your actual recommendation.
```

**3. The Compounding Question Chain**
```
I want to deeply understand [topic]. Don't just answer my question — after each answer, ask me the single most valuable follow-up question I should be asking next, and wait for me before continuing. Do this for 5 rounds.

My first question: [your question]
```

**4. The Constraint Relaxer**
```
I'm stuck on this problem: [describe it]. List every constraint I've assumed is fixed. For each one, tell me what becomes possible if that constraint were actually removable — even if it sounds unrealistic. Then tell me which relaxed constraint is most worth actually questioning.
```

**5. The First-Principles Rebuild**
```
Forget how [thing] is conventionally done. If you had to design a solution to [the underlying problem] from first principles, with no reference to existing approaches, what would you build? Then compare it honestly to the conventional approach.
```

---

## Section 2: Writing & Communication Power Moves

**6. The Three-Draft Squeeze**
```
Write [piece] three times: Draft 1 maximally detailed and complete. Draft 2 cut to 50% of the length, same key points. Draft 3 cut to 20% of the original, only the single most important point remaining. Show me all three.
```

**7. The Audience Triangulation**
```
Rewrite this for three different audiences without changing the core message: a complete beginner, a skeptical expert, and a busy executive with 30 seconds. Make each version genuinely fit its audience, not just shorter/longer versions of the same thing.

[paste your content]
```

**8. The Objection Anticipator**
```
Read this argument/pitch and list every objection a smart, skeptical reader would raise — then write a one-sentence rebuttal for each, ready to weave in if needed.

[paste your argument/pitch]
```

**9. The Voice Triangulation**
```
Here are three samples of writing I admire (not necessarily my own): [paste 3 short samples]. Identify what these three have in common stylistically, then write [my piece] borrowing those specific qualities — name which quality came from which sample.
```

**10. The Reverse Outline**
```
Read this finished piece and reverse-engineer its outline — what structure did the writer actually use, beat by beat? Then tell me if that structure is the best fit for the content, or if a different structure would serve it better.

[paste finished piece]
```

---

## Section 3: Multi-Agent-Style Workflows (run these as their own Project)

**11. The Panel of Experts**
```
You are simulating a panel of three experts with genuinely different perspectives on [topic]: [name or describe 3 relevant expert viewpoints]. Each gives their honest take on my question, including where they'd disagree with each other. Then synthesize the strongest combined answer.

My question: [question]
```

**12. The Red Team / Blue Team**
```
Run this as two roles in sequence. First, as RED TEAM: find every weakness, risk, and failure mode in this plan, as harshly and specifically as a real adversary would. Then, as BLUE TEAM: respond to each Red Team point with either a fix or an honest acknowledgment that it's a real unaddressed risk.

Plan: [describe it]
```

**13. The Devil's Advocate Loop**
```
We're going to go back and forth. I'll state a position, you argue the strongest opposing view, I'll respond, and you continue pushing back — genuinely, not performatively — until I say "done." Don't fold early just to be agreeable.

My position: [your position]
```

**14. The Specialist Handoff**
```
Act as a [first specialist, e.g. "strategist"] and produce [output]. Then, in the same response, switch hats to a [second specialist, e.g. "skeptical CFO"] and critique what the strategist just produced, focused specifically on what a strategist would typically overlook.
```

**15. The Socratic Tutor**
```
Don't teach me [topic] by explaining it — teach me by asking me questions that lead me to figure it out myself, one question at a time, only revealing the answer if I genuinely can't get there after 2 attempts.

Topic: [topic]
```

---

## Section 4: Research & Analysis Workflows

**16. The Source Triangulation**
```
For this claim, reason through what kind of evidence would actually prove or disprove it, then assess how strong the claim is based on what's commonly known — and flag clearly which parts of your answer are well-established versus your own inference.

Claim: [claim]
```

**17. The Assumption Audit**
```
List every assumption embedded in this statement or plan, including the ones that feel too obvious to state. For each, tell me how confident I should actually be that it's true.

[paste statement or plan]
```

**18. The Base Rate Check**
```
Before I get excited about this specific case, tell me the general base rate / typical outcome for situations like this one — then tell me what would need to be true about MY specific situation for it to beat that base rate.

Situation: [describe it]
```

**19. The Comparative Framework Builder**
```
Build me a comparison framework (not just a table) for evaluating options like these: [list options]. Tell me the 4-5 dimensions that actually matter most for this kind of decision, weighted by importance, before scoring each option.
```

**20. The Confidence-Calibrated Answer**
```
Answer this, but explicitly separate your response into: what you're highly confident about, what's a reasonable inference, and what's genuinely uncertain or contested. Don't blend all three into one confident-sounding paragraph.

Question: [question]
```

---

## Section 5: Iteration & Refinement Loops

**21. The Worst-Version-First**
```
Write the worst, laziest, most generic possible version of [piece] first — on purpose. Then use that as a foil: rewrite it avoiding every specific flaw the bad version had.
```

**22. The Constraint Ladder**
```
Write [piece] with no constraints first. Then rewrite it with this constraint: [add one real constraint, e.g. "half the length"]. Then add another: [second constraint]. Show me how the piece evolves at each stage, not just the final version.
```

**23. The Self-Critique Pass**
```
Write [piece]. Then, switching to a critical-editor mindset, identify the 3 weakest parts of what you just wrote and rewrite only those parts, integrated back into the full piece.
```

**24. The Ten-Variations Sprint**
```
Generate 10 genuinely different versions of [short piece — headline, opening line, etc.] — not 10 minor wording changes, 10 different angles/approaches entirely. Then tell me which 2 you'd actually bet on and why.
```

**25. The Translate-and-Back Check**
```
Take this piece and explain its core argument in the simplest possible terms, as if to a child. If that simple explanation reveals the original argument is weaker or more confused than it sounded, tell me directly.

[paste piece]
```

---

## Section 6: Decision & Strategy Workflows

**26. The Reversibility Sort**
```
Sort these decisions/options by how reversible each one is if it turns out wrong: [list them]. Recommend moving fastest on the most reversible ones and being most careful on the least reversible, regardless of which seems most exciting.
```

**27. The Opportunity Cost Surfacer**
```
If I commit to [option/plan], what's the single most plausible alternative use of that same time/money/effort that I'd be giving up? Be specific, not generic ("you could do something else").
```

**28. The Minimum Viable Test**
```
Before I build/commit to the full version of [idea], design the smallest, fastest, cheapest possible test that would tell me whether the core assumption behind it is actually true.

Idea: [idea]
```

**29. The Second-Order Effects Mapper**
```
For this decision, map out not just the immediate result but the second-order effects — what happens as a RESULT of the first result, a few steps out. Focus on the non-obvious ones.

Decision: [decision]
```

**30. The Pre-Commitment Device**
```
Help me design a pre-commitment for [goal] — a specific, concrete rule I set now that makes it harder for future-me to talk myself out of it later, with a real consequence attached if I break it.
```

---

## Section 7: Creative & Brainstorming Workflows

**31. The Combinatorial Generator**
```
Generate ideas for [goal] by deliberately combining two unrelated things: [concept A] and [concept B]. Force at least 8 genuinely different combinations, not variations on one.
```

**32. The Constraint-as-Creativity Prompt**
```
Generate ideas for [goal], but every idea must satisfy this unusual constraint: [add an arbitrary creative constraint, e.g. "must cost under $10" or "must work without electricity"]. Constraints like this often produce more original ideas than open brainstorming.
```

**33. The Bad-Idea Mining**
```
Give me 10 deliberately bad/absurd ideas for [goal] first. Then mine each bad idea for the one genuinely useful insight or angle hiding inside it.
```

**34. The Cross-Industry Borrow**
```
How would someone in [a completely unrelated industry] solve a problem structurally similar to mine? My problem: [problem]. Borrow their approach and adapt it to my context.
```

**35. The "What Would X Do" Council**
```
If [a specific person or archetype, real or fictional] approached this problem, what would their distinct angle be? Run this for 3 very different people/archetypes, then tell me which angle is most actionable for my actual situation.

Problem: [problem]
```

---

## Section 8: Personal Productivity Workflows

**36. The Energy-Matched Schedule**
```
Here's my task list for today: [list]. Sort it not by priority but by what kind of mental energy each task needs (deep focus, quick/easy, creative, social) — then build a schedule that matches high-energy tasks to when I'm typically sharpest.
```

**37. The Two-Minute Triage**
```
Look at this list of things I'm putting off: [list]. Flag which ones would genuinely take under 5 minutes to just finish right now — separate from the ones I'm avoiding because they're actually hard, not because they're quick.
```

**38. The Procrastination Diagnosis**
```
I keep avoiding this task: [task]. Don't just tell me to "just do it" — ask me questions to figure out the actual reason I'm avoiding it (unclear next step, fear of doing it badly, genuinely don't want to, etc.), then give me a fix matched to the real reason.
```

**39. The Weekly Debrief**
```
Here's what actually happened this week: [brief recap]. Help me extract: one thing that worked better than expected, one thing that didn't work, and one specific adjustment for next week — not a generic reflection.
```

**40. The Default-Setting Session**
```
I keep having to make this same small decision repeatedly: [describe it]. Help me design a default rule so I never have to actively decide it again, only revisiting if circumstances genuinely change.
```

---

## Section 9: Negotiation & Influence Workflows

**41. The Anchor-and-Adjust Script**
```
I'm negotiating [situation]. Help me figure out the right opening anchor — ambitious but not laughable — and script my opening line plus my planned response to their likely counter.
```

**42. The Interest-Behind-the-Position**
```
The other side in this negotiation is asking for [their stated position]. Help me think through what underlying interest is probably driving that position, since addressing the real interest sometimes lets both sides get more than fighting over the stated position would.
```

**43. The BATNA Check**
```
Before I negotiate [situation], help me honestly assess my best alternative if this falls through entirely — and tell me how that should change my walk-away point.
```

**44. The Concession Sequencer**
```
I have these things I could concede in this negotiation: [list]. Help me sequence them — which to offer first, which to hold as a "closer," and which to frame as a big deal even if it costs me little.
```

**45. The Difficult-Ask Framer**
```
I need to ask for [difficult ask] from [who]. Help me frame it in a way that's honest but maximizes the chance of a yes — focused on their actual incentives, not just my justification for wanting it.
```

---

## Section 10: Meta-Prompts (Prompts About Prompting)

**46. The Prompt Doctor**
```
Here's a prompt I've been using that isn't getting good results: [paste your prompt]. Diagnose specifically why it's underperforming and rewrite it to fix the actual problem.
```

**47. The Output-Format Lock**
```
For everything in this conversation going forward, respond using exactly this format: [describe format]. If a request doesn't naturally fit that format, tell me instead of forcing it awkwardly.
```

**48. The Self-Documenting Prompt**
```
Whenever you give me a non-obvious answer, append a one-line note explaining your reasoning process, separate from the main answer — so I can learn the pattern, not just receive the output.
```

**49. The Calibration Request**
```
On a scale of 1-10, how confident are you in this answer, and what would change your confidence the most — more information from me, or something genuinely uncertain in the underlying topic?
```

**50. The Vault Combiner**
```
Combine [Prompt #__] and [Prompt #__] from this vault into a single workflow for [my specific goal] — adapt both so they work together as one coherent process instead of two separate steps.
```

---

### A Few Friendly Reminders

- These are advanced — if any feel like a stretch, that's normal. Start with Section 1 or 2 and work outward.
- Most work inline in any chat. Sections 3 and 11-15 specifically work best as their own dedicated Project.
- Works on the **free** Claude plan. No paid tier required.
- Questions? Email **support@claudecraft.ca**.
