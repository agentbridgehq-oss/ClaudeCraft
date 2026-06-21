# ClaudeCraft OpenClaw — Daily Ops Agent

A sandboxed agent that runs once a day, pulls your real Stripe sales numbers, drafts one new piece of marketing content (rotating through your 6 bundle segments), and writes a report. **It never posts anywhere, sends any message, or touches anything outside this container.** You review the report and personally post anything you like from it.

## What's contained, and how

- No direct internet access at all — its only route out is an egress proxy that allows exactly two domains: `api.anthropic.com` and `api.stripe.com`. Nothing else is reachable, including your bank, your email, or any social platform.
- No access to your files — the only folder it can write to is `./reports`, mounted from this folder.
- Runs as a non-root user, read-only root filesystem, all Linux capabilities dropped.
- It was never given Reddit/social/email credentials, so even if it "wanted" to post, it has no mechanism to do so.

## One-Time Setup

1. **Install Docker Desktop** if you don't have it (docker.com/products/docker-desktop).
2. Copy `.env.openclaw.example` to `.env.openclaw` (same folder).
3. Fill in `.env.openclaw` with two values — **set these directly in this file, never paste them into a chat with Claude:**
   - `ANTHROPIC_API_KEY` — create a new, dedicated key at console.anthropic.com with a low spend limit (a few dollars/month cap is plenty for one short message a day).
   - `STRIPE_SECRET_KEY` — your existing restricted key, but go to Stripe → Developers → API keys → edit that key → make sure **Checkout Sessions: Read** is enabled (Write alone won't let it pull sales numbers).

## Running It Manually (test it once first)

From this folder (`claudecraft/openclaw/`):

```
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
