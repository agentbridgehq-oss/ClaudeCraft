# The Claude Code Builder's Guide
### How ClaudeCraft Itself Was Actually Built — And How You Can Build Something Real, Too

This isn't a generic "intro to coding" guide. This is the literal step-by-step path from zero to a real, live, selling-product website — using Claude Code inside VS Code, the same way ClaudeCraft itself was built. No prior coding experience is assumed, but you will end up writing real code, because that's what actually happened here.

There is no test at the end. Follow it start to finish, or jump to whatever Part matches where you're stuck.

---

## Part 1: The Real Story (5 minutes)

### Step 1.1 — What actually happened
- 1.1.a ClaudeCraft — this exact site, the chatbot, the checkout flow, the article system — was built by describing what was needed in plain English, inside VS Code, to Claude Code. Not by hand-writing thousands of lines of code line-by-line.
- 1.1.b The process looked like: "add a self-serve refund page that checks Stripe and auto-refunds within 30 days" → Claude Code reads the existing codebase, writes the new code, wires it in, and explains what changed. Then: test it, ask for fixes, repeat.
- 1.1.c This is the actual skill worth learning in 2026: not memorizing syntax, but clearly describing what you want, reviewing what comes back, and iterating. That's it. That's the whole job now.

### Step 1.2 — What you need going in
- 1.2.a No coding background required. You do need patience for a 15-minute setup and a willingness to read what Claude Code writes, not just blindly accept it.
- 1.2.b A computer (Windows, Mac, or Linux all work identically for this).
- 1.2.c A few dollars or a subscription — covered honestly in Part 2, no surprises.

---

## Part 2: Getting Access to Claude Code (10 minutes)

### Step 2.1 — Understand the two ways to pay for it
- 2.1.a **Option A — Claude Pro or Max subscription** ($20/mo or $100+/mo at claude.ai). This includes Claude Code usage as part of the subscription, with generous usage limits. Simplest option if you're not sure how much you'll use it.
- 2.1.b **Option B — Anthropic API billing** (console.anthropic.com). Pay-as-you-go per token instead of a flat subscription. Better if you only plan to use it occasionally, since there's no monthly minimum.
- 2.1.c Either path works identically once it's set up — Claude Code itself doesn't care which one you chose.

### Step 2.2 — Create your account
- 2.2.a For the subscription path: go to **claude.ai**, sign up, then upgrade to Pro or Max under Settings → Billing.
- 2.2.b For the API path: go to **console.anthropic.com**, sign up, and add a payment method under Settings → Billing. You'll generate an API key here — keep it private, never paste it into a public file or share it in chat.

---

## Part 3: Installing Claude Code in VS Code (15 minutes)

### Step 3.1 — Install VS Code (if you don't have it)
- 3.1.a Go to **code.visualstudio.com**, download the version for your operating system, run the installer with default options.

### Step 3.2 — Install Node.js (required to run Claude Code)
- 3.2.a Go to **nodejs.org**, download the **LTS** version, run the installer with default options.
- 3.2.b Restart VS Code after installing Node.js so it picks up the new installation.

### Step 3.3 — Install Claude Code itself
- 3.3.a Open VS Code's integrated terminal: **Terminal → New Terminal** from the top menu.
- 3.3.b Type exactly: `npm install -g @anthropic-ai/claude-code` and press Enter. This downloads and installs the Claude Code CLI globally on your machine.
- 3.3.c Alternatively, search "Claude Code" in VS Code's Extensions panel (the square-icon tab on the left sidebar) and install the official extension — it wraps the same CLI in a more integrated panel inside the editor. Both approaches work; the extension is more visual, the raw CLI is more direct.

### Step 3.4 — Log in
- 3.4.a In the terminal, navigate to a folder you want to work in (e.g., `cd Desktop` then `mkdir my-first-project` then `cd my-first-project`).
- 3.4.b Type `claude` and press Enter.
- 3.4.c The first time, it opens your browser to log in with the Anthropic account from Part 2. Approve it, return to VS Code — you're now in a live Claude Code session.

---

## Part 4: Your First Real Session (15 minutes)

### Step 4.1 — Start small, on purpose
- 4.1.a With Claude Code running in your project folder, type a plain-English request: "Create a simple webpage that says Hello World with a nice dark background and an orange heading."
- 4.1.b Watch what happens: Claude Code will create a file (probably `index.html`), show you the content, and explain what it did.

### Step 4.2 — Review before you trust
- 4.2.a Open the file it created. Read it. You don't need to understand every line — you DO want to get comfortable looking at what changed before assuming it's correct.
- 4.2.b If something's off, just say so in plain English: "make the heading bigger" or "that's not centered, fix it." This back-and-forth IS the actual workflow — most real sessions are 10-50 rounds of this, not one perfect request.

### Step 4.3 — See it for real
- 4.3.a Right-click the HTML file in VS Code's file explorer (left sidebar) → if you have the "Live Server" extension, choose "Open with Live Server." Otherwise, just double-click the file to open it in your browser directly.

---

## Part 5: How ClaudeCraft Was Actually Built (10 minutes)

### Step 5.1 — The real pattern, every single time
- 5.1.a Describe the feature in plain English ("add a countdown timer banner at the top offering 50% off").
- 5.1.b Claude Code reads the existing files first — it doesn't guess, it actually opens and reads your real codebase before changing anything.
- 5.1.c It makes the change, explains what it touched, and you check it (usually by actually loading the site and looking, exactly like Part 4.3).
- 5.1.d If something's wrong or you want it different, say exactly what's wrong. "The timer looks great but it should say days left, not just hours."

### Step 5.2 — Bigger features are the same pattern, just longer
- 5.2.a A whole payment system (Stripe checkout, webhooks, refunds) was built the same way as the Hello World page in Part 4 — just many more rounds of describe → review → adjust. There's no secret extra skill for "big" features.
- 5.2.b The only real difference at scale: ask for one feature at a time, not five at once. "Add Stripe checkout" then test it, THEN "now add a referral program" — not all of it in one giant request.

---

## Part 6: Getting It Live (Deploying)

### Step 6.1 — Put your code somewhere safe (GitHub)
- 6.1.a Create a free account at **github.com**.
- 6.1.b Ask Claude Code directly: "help me create a GitHub repo for this project and push my code to it." It will walk you through the exact commands for your specific setup.

### Step 6.2 — Put it on the actual internet (Railway)
- 6.2.a ClaudeCraft itself runs on **Railway** (railway.app) — a hosting service that deploys straight from a folder or GitHub repo with minimal configuration.
- 6.2.b Create a free Railway account, then ask Claude Code: "help me deploy this project to Railway." It can install Railway's CLI and walk through linking your project, same as everything else in this guide.

---

## Part 7: The Honest Mental Model Shift

### Step 7.1 — What actually changed about "being a developer"
- 7.1.a The bottleneck used to be: do you know the syntax. Now the bottleneck is: can you describe clearly what you want, and can you tell when the result is actually right.
- 7.1.b That second skill — clear description plus honest review — is genuinely learnable by anyone willing to practice it, regardless of coding background.

### Step 7.2 — The most common mistake
- 7.2.a Accepting changes without actually looking at them, then being surprised later when something breaks. Always do the Part 4.2 review step, every time, especially for anything touching money or user data.
- 7.2.b The second most common mistake: asking for too much in one request. One clear feature at a time, tested before moving to the next, beats one giant request every time.

You now know the actual process behind this entire website. There's no more secret to it than what's in this guide.
