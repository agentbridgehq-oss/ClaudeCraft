# ClaudeCraft OpenClaw — Daily Ops Agent

A sandboxed agent that runs once a day: pulls your real Stripe sales numbers, reviews the support escalation queue and drafts a suggested reply + refund/discount recommendation for each one, drafts a full daily marketing pack — a Reddit post, an X/Twitter thread, and a LinkedIn post, all built around one genuinely useful Claude prompt, rotating through your 6 bundle segments — and writes a report — **and also auto-publishes two free articles (one Claude/Anthropic-specific, one broader AI news) to ClaudeCraft's own live Articles section.** Publishing to our own site is the one approved automation. It never posts to Reddit, social media, or any third-party platform, never sends a customer-facing email or processes a refund/discount itself, and never touches anything outside this container — every customer-facing draft and recommendation lands in the report for you to read, edit, and act on yourself.

## What's contained, and how

- No direct internet access except an egress proxy allowing exactly the domains needed: `api.anthropic.com`, `api.stripe.com`, and the ClaudeCraft site itself (to publish articles via its `/api/articles` endpoint). Nothing else is reachable, including your bank, your email, or any social platform.
- No access to your files — the only folder it can write to is `./reports`, mounted from this folder.
- Runs as a non-root user, read-only root filesystem, all Linux capabilities dropped.
- It was never given Reddit/social/email credentials, so even if it "wanted" to post to a third-party platform, it has no mechanism to do so.

## One-Time Setup

1. **Install Docker Desktop** if you don't have it (docker.com/products/docker-desktop).
2. Copy `.env.openclaw.example` to `.env.openclaw` (same folder).
3. Fill in `.env.openclaw` with four values — **set these directly in this file, never paste them into a chat with Claude:**
   - `ANTHROPIC_API_KEY` — create a new, dedicated key at console.anthropic.com with a low spend limit (this now drafts 2 articles + escalation reviews daily, with web search — check the cap is still comfortable).
   - `STRIPE_SECRET_KEY` — your existing restricted key, but go to Stripe → Developers → API keys → edit that key → make sure **Checkout Sessions: Read** is enabled (Write alone won't let it pull sales numbers).
   - `ARTICLES_API_TOKEN` — must exactly match the main ClaudeCraft web service's `ARTICLES_API_TOKEN` on Railway. This is the most commonly missed step — without it matching, article publishing and escalation review both silently fail.
   - `PUBLIC_BASE_URL` — the live site's real URL (e.g. `https://claudecraft.ca`).

**If deploying this to Railway as its own service** (using `railway.toml`'s cron schedule, instead of the local Docker option below), set these same four variables in that Railway service's own environment variables — they are separate from the main site's service and don't inherit automatically.

## Running It Manually (test it once first)

From this folder (`claudecraft/openclaw/`):

```bash
docker compose -f docker-compose.openclaw.yml up --build
```

Check `./reports/<today's date>.md` for the output. Run `docker compose -f docker-compose.openclaw.yml down` after to clean up the containers.

## Running It Daily (automatically)

This container runs once and exits — it's not a long-running service — so use Windows Task Scheduler to trigger it daily:

1. Open **Task Scheduler** (search in the Start menu).
2. **Create Task** → name it `ClaudeCraft OpenClaw Daily`.
3. **Triggers** tab → New → Daily → pick a time (e.g. 7:00 AM).
4. **Actions** tab → New → **Start a program**:
   - Program: `docker`
   - Arguments: `compose -f docker-compose.openclaw.yml up --build --abort-on-container-exit`
   - Start in: the full path to this `openclaw` folder
5. Save. Test it once with **Run** in Task Scheduler before trusting the schedule.

## Reading the Report

Each day's report lands in `./reports/YYYY-MM-DD.md`. It always starts with a reminder that nothing in it has been posted — it's a starting point for you to review, edit, and post yourself wherever makes sense (Reddit, your own social accounts, etc.), the same way the hand-written Reddit drafts and affiliate template were done earlier.
