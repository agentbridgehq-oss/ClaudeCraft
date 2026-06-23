# The Claude Code Builder's Guide
### My Story, and the Real Step-by-Step Path From Zero to a Live, Selling Website

This isn't a generic "intro to coding" guide, and it isn't a polished highlight reel either. This is the actual path — including the parts that went sideways — from someone who built this exact website (ClaudeCraft, the one you're reading this on) using Claude Code inside VS Code, around a full-time job, without a software engineering background.

There is no test at the end. Follow it start to finish, or jump straight to whatever Part matches where you're stuck.

---

## Part 0: Why I'm Writing This

I work an industrial job. Building this happened in the hours around that — early mornings before a shift, late nights after one, weekends when I had them. I'm telling you that up front because most "how I built my SaaS" content gets written by people who had nothing but time, and that's not realistic for most people reading this.

Some of it was genuinely hard in ways that had nothing to do with code. There were nights I sat down to work on this with real brain fog — tired in a way where reading a single paragraph twice still didn't land. The honest fix wasn't pushing through harder. It was smaller sessions, more often, and being okay with a night where the only thing that got done was one small fix instead of a big feature. Progress that's slow but doesn't stop beats a burst of effort that burns you out for a week afterward. I learned that the hard way, more than once.

I'm not sharing this because I think my story is special. I'm sharing it because I think the actual barrier for most people isn't intelligence or even time — it's believing the technical part is harder than it actually is now, and giving up before finding out it isn't. I genuinely want this guide to close that gap for you. Not a sales pitch — an honest map of the terrain, including the potholes.

---

## Part 1: The Real Story of How ClaudeCraft Was Built

### Step 1.1 — Where the idea came from
- 1.1.a I went looking for other people's Claude prompt setups and found a flood of cheap, dumped-out prompt PDFs on Etsy and Gumroad — no setup help, no guarantee, no real person behind them.
- 1.1.b I decided to build the thing I actually wanted to buy: curated, tested, with a real setup guide and a real person standing behind it if something didn't work.

### Step 1.2 — How it was actually built
- 1.2.a Every part of this site — the chatbot, the checkout, the article system, the refund flow — was built by describing what was needed in plain English to Claude Code, reviewing what came back, and correcting it. Not hand-writing thousands of lines line by line.
- 1.2.b That loop — describe, review, correct — is the entire skill this guide is trying to teach you. Everything else in this document is detail underneath that one idea.

### Step 1.3 — What you need going in
- 1.3.a No coding background required. You do need patience for setup and a willingness to actually read what Claude Code writes, not just blindly accept it.
- 1.3.b A computer (Windows, Mac, or Linux all work identically for this) and a few dollars or a subscription, covered honestly in Part 3.

---

## Part 2: Understanding Your Computer's File System

This part gets skipped in almost every tutorial, and it's exactly the part that quietly stops beginners cold later on. Five minutes here saves you real confusion in Part 5 onward.

### Step 2.1 — What a "file system" actually is
- 2.1.a Every file on your computer lives inside a folder, and every folder lives inside another folder, all the way back to one root location (`C:\` on Windows, `/` on Mac/Linux). This nested structure is the file system.
- 2.1.b A "path" is just the full address of where a file lives, written as folder names separated by slashes — e.g. `C:\Users\YourName\Desktop\my-project\index.html` tells you exactly where to find `index.html`: inside `my-project`, inside `Desktop`, inside your user folder.

### Step 2.2 — Where your project should actually live
- 2.2.a Pick one clear spot, e.g. a folder called `Desktop\my-project` or `Documents\projects\my-project`. Avoid burying it ten folders deep — you'll be navigating here constantly.
- 2.2.b If you use OneDrive, Dropbox, or iCloud Drive sync, consider keeping active coding projects **outside** those synced folders. Cloud-sync tools can interfere with the constant small file writes a code editor does, causing strange "file in use" errors. Plain local folders avoid this entirely.

### Step 2.3 — Navigating in VS Code (the easy way)
- 2.3.a **File → Open Folder** in VS Code, select your project folder. The left sidebar now shows every file and folder inside it — this is the same file system from Step 2.1, just shown visually.
- 2.3.b Click any file in that sidebar to open it. Right-click for New File, New Folder, Rename, Delete — all the same actions you'd do in Windows Explorer or Finder, just inside the editor.

### Step 2.4 — Navigating in the terminal (the part that looks scarier than it is)
- 2.4.a `cd` means "change directory" — it moves you into a folder. `cd my-project` moves into a folder named `my-project` that's inside your current location.
- 2.4.b `cd ..` moves UP one level (out of the current folder, into its parent).
- 2.4.c `dir` (Windows) or `ls` (Mac/Linux) lists everything in your current folder, so you can see where you are.
- 2.4.d You will use exactly these few commands constantly. There isn't a long list of terminal commands you secretly need to memorize — Claude Code handles the complex ones for you when you ask it to.

---

## Part 3: Getting Access to Claude Code

### Step 3.1 — Understand the two ways to pay for it
- 3.1.a **Option A — Claude Pro or Max subscription** ($20/mo or $100+/mo at claude.ai). Includes Claude Code usage as part of the subscription. Simplest if you're not sure how much you'll use it.
- 3.1.b **Option B — Anthropic API billing** (console.anthropic.com). Pay-as-you-go per token, no monthly minimum. Better for occasional use.
- 3.1.c Either path works identically once set up — Claude Code doesn't care which one you chose.

### Step 3.2 — Create your account
- 3.2.a Subscription path: go to **claude.ai**, sign up, upgrade to Pro or Max under Settings → Billing.
- 3.2.b API path: go to **console.anthropic.com**, sign up, add a payment method under Settings → Billing, and generate an API key. Keep it private — never paste it into a public file or share it in chat.

---

## Part 4: Installing Claude Code in VS Code

### Step 4.1 — Install VS Code
- 4.1.a Go to **code.visualstudio.com**, download for your OS, run the installer with default options.

### Step 4.2 — Install Node.js (required to run Claude Code)
- 4.2.a Go to **nodejs.org**, download the **LTS** version, run the installer with default options. Restart VS Code afterward.

### Step 4.3 — Install Claude Code itself
- 4.3.a Open VS Code's terminal: **Terminal → New Terminal**.
- 4.3.b Type `npm install -g @anthropic-ai/claude-code` and press Enter.
- 4.3.c Or: search "Claude Code" in VS Code's Extensions panel and install the official extension — a more visual wrapper around the same tool.

### Step 4.4 — Log in
- 4.4.a In the terminal, navigate to your project folder using Part 2's `cd` command.
- 4.4.b Type `claude` and press Enter. First time, it opens your browser to log in with your Anthropic account — approve it, return to VS Code. You're now in a live session.

---

## Part 5: What GitHub Actually Is, and Why It Matters

### Step 5.1 — The plain-English version
- 5.1.a GitHub is a website that stores a copy of your project's code online, and keeps a complete history of every change ever made to it — like a save-game system for your whole project, not just one file.
- 5.1.b "Git" is the actual version-control tool doing the tracking (built into VS Code and Claude Code already). "GitHub" is just the most popular website for hosting those tracked projects online.

### Step 5.2 — Why a non-engineer should care
- 5.2.a If something breaks, you can go back to any earlier saved point — your work is never permanently lost to one bad change.
- 5.2.b It's the standard way to hand your code to a hosting service (Railway, in Part 9) so it can actually go live on the internet.
- 5.2.c A "commit" is just a labeled checkpoint — "save this exact state, with this description of what changed." A "push" sends your commits up to GitHub's servers.

### Step 5.3 — Create your account and first repository
- 5.3.a Go to **github.com**, sign up for free.
- 5.3.b Click **New Repository**, give it a name, leave the rest as default, click **Create**.
- 5.3.c Back in VS Code's terminal, inside your project folder, ask Claude Code directly: "help me connect this project to the GitHub repo I just created and push my code to it." It will give you the exact commands for your specific setup — you don't need to memorize Git commands.

---

## Part 6: Your First Real Session

### Step 6.1 — Start small, on purpose
- 6.1.a With Claude Code running, type: "Create a simple webpage that says Hello World with a dark background and an orange heading."
- 6.1.b Watch it create a file (probably `index.html`), show you the content, and explain what it did.

### Step 6.2 — Review before you trust
- 6.2.a Open the file. Read it. You don't need to understand every line — you DO want to get comfortable looking at what changed before assuming it's correct.
- 6.2.b If something's off, just say so in plain English: "make the heading bigger" or "that's not centered, fix it."

### Step 6.3 — See it for real
- 6.3.a Right-click the HTML file in VS Code's sidebar → "Open with Live Server" (if installed), or just double-click it to open in your browser directly.

---

## Part 7: "Vibe Coding" — The Actual Workflow, Properly Explained

People use "vibe coding" to mean different things. Here's specifically what it meant building this site, so you're not guessing at the term.

### Step 7.1 — The real pattern, every single time
- 7.1.a Describe the feature in plain English: "add a countdown timer banner at the top offering 50% off."
- 7.1.b Claude Code reads your existing files first — it doesn't guess, it actually opens and reads the real codebase before changing anything.
- 7.1.c It makes the change and explains what it touched. You check it for real — load the actual site, look at the actual result.
- 7.1.d If something's wrong, say exactly what's wrong, the same way you'd correct a person: "the timer looks great but it should say days left, not just hours."

### Step 7.2 — One feature at a time, not five
- 7.2.a Big features get built with the exact same loop as small ones — just more rounds of it. A whole payment system was built the same way as the Hello World page, just many more back-and-forth rounds.
- 7.2.b The single most common beginner mistake: asking for five things in one giant request. Ask for one, test it, then ask for the next.

### Step 7.3 — "Vibe" doesn't mean "skip reviewing"
- 7.3.a The loose, conversational feel of vibe coding is real — but it only works long-term if you still do Step 6.2's review step every time, especially for anything touching money, passwords, or user data. Speed without any review is how real mistakes ship unnoticed.

---

## Part 8: Connecting Stripe for Real Payments

### Step 8.1 — The plain-English version of what Stripe does
- 8.1.a Stripe is a payment processor — it's the service that actually handles someone's credit card safely, so you never have to touch raw card numbers yourself (which you legally shouldn't, without serious extra compliance work).
- 8.1.b "Checkout" is the page Stripe shows your customer to actually pay. A "webhook" is Stripe notifying YOUR server after a payment succeeds, so your code knows to deliver the product/send the email/etc.

### Step 8.2 — Get your keys, test mode first
- 8.2.a Sign up at **stripe.com**. In the dashboard, toggle to **Test mode** (top right) before doing anything else.
- 8.2.b Under Developers → API Keys, copy your test **Secret key**. Never paste a real secret key into a chat with any AI, including Claude Code — keep it in your project's environment variables instead, and ask Claude Code to help you set that up securely.

### Step 8.3 — Build and test before going live
- 8.3.a Ask Claude Code: "help me add a Stripe checkout flow for [your product]." Test it with Stripe's test card number `4242 4242 4242 4242` (any future expiry, any CVC) — it simulates a real successful payment with zero real money moving.
- 8.3.b Only switch to your **live** Stripe key once test mode works end-to-end, including whatever happens after payment (download links, confirmation email, etc.).

---

## Part 9: Deploying for Real — Railway & GitHub Together

### Step 9.1 — Push your code to GitHub
- 9.1.a Using Part 5's setup, make sure your latest code is committed and pushed.

### Step 9.2 — Deploy on Railway
- 9.2.a ClaudeCraft itself runs on **Railway** (railway.app) — it deploys straight from a GitHub repo or a folder, with minimal configuration.
- 9.2.b Create a free Railway account, then ask Claude Code directly: "help me deploy this project to Railway." It can install Railway's CLI and walk through linking your project the same as everything else in this guide.
- 9.2.c Add any secret keys (Stripe, etc.) in Railway's own Variables tab in its dashboard — never inside your code files, and never pasted into chat.

---

## Part 10: Setting Up Your Own Scheduled Agent (OpenClaw-Style)

ClaudeCraft has a small companion script that runs automatically once a day, pulls fresh information, and publishes a new article with zero manual work. Here's the plain-English version of how that actually works, so you can build your own.

### Step 10.1 — What a "scheduled task" / "cron job" actually is
- 10.1.a A cron job is just an instruction to a hosting service: "run this specific script automatically, on this schedule, forever — I don't have to be there." `0 12 * * *` is cron's shorthand for "every day at 12:00."
- 10.1.b You don't need to memorize that syntax. Ask Claude Code: "I want this script to run automatically once a day at noon" — it will write the correct schedule for you.

### Step 10.2 — Build the script itself
- 10.2.a Describe the actual job in plain English: "write a script that fetches today's date, generates a short news summary, and posts it to my site's API." Claude Code writes it as a normal script file, same as everything else in this guide.
- 10.2.b Test it manually first by just running it directly (ask Claude Code how, for your specific script) before trusting the automatic schedule.

### Step 10.3 — Deploy it as its own small service
- 10.3.a On Railway, a scheduled script is usually its own separate, small service — separate from your main website, so a failure in one doesn't affect the other. Ask Claude Code: "help me deploy this as a separate Railway service with a daily cron schedule," and it'll walk you through the actual Railway-specific configuration file needed.
- 10.3.b Keep it simple on purpose. One script with a few clearly-named functions inside it (one per task) is easier to maintain than splitting every task into its own separate service — more moving services means more places for a small mistake to hide, without giving you any real extra capability.

---

## Part 11: Getting Through the Tough Spots

### Step 11.1 — Brain fog is real, plan around it instead of fighting it
- 11.1.a On low-energy nights, shrink the task instead of pushing through. "Fix this one small thing" is a completable session. "Build the whole feature" on no sleep usually isn't, and the frustration from failing at it costs you more than the smaller session would have.
- 11.1.b If you genuinely can't tell whether something looks right anymore, that's the signal to stop for the night, not to keep adjusting. Fresh eyes the next day catch things tired eyes miss.

### Step 11.2 — Protecting sleep and your actual job
- 11.2.a This got built around a real industrial job, not instead of one. The work didn't go away because a side project existed — the realistic move was smaller, more frequent sessions instead of rare giant ones that ate sleep before a shift.
- 11.2.b Progress that's slow but never fully stops beats an intense burst that burns you out for a week after. Treat consistency as the actual goal, not speed.

### Step 11.3 — Why share this honestly
- 11.3.a The real barrier for most people isn't intelligence or even time — it's believing the technical side is harder than it actually is now, and quitting before finding out otherwise.
- 11.3.b If this guide helps even one person get past that and actually finish something, sharing the messy, honest version of how this happened — including the parts that went sideways — was worth more than a polished highlight reel ever would have been.

---

## Part 12: Where to Go From Here

### Step 12.1 — You now know the real process
- 12.1.a Account setup, file system navigation, Claude Code, GitHub, Stripe, Railway, your own scheduled agent, and the actual describe-review-correct workflow behind all of it. There's no more secret to it than what's in this guide.
- 12.1.b The next idea you have — build it the same way. Small steps, real review, one feature at a time, and grace for the nights you're running on no sleep.
