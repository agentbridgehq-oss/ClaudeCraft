# ClaudeCraft

A storefront selling done-for-you Claude AI skill bundles (one-time Stripe payments) plus a $12/mo "Insider" subscription, a free articles section, and a referral/loyalty/refund system — all served by a single Node/Express process. Live at `claudecraft.ca`, deployed on Railway.

## Repo layout

```
static-server.mjs        The entire backend — Express app, all routes, all server-rendered pages (~1700 lines)
index.html                Static homepage (hero, product grid, chat widget) — served as-is by express.static
shared.css                Design system shared by index.html and the server-rendered pages
*.html (root)              Other static pages: privacy, terms, refund, discount, founder-story, ebook, free-ad-guide, ad-platforms-playbook
manifest.json              PWA manifest for the Insider library (/insider/library)
sw.js                      Service worker for the Insider PWA
bundles/<slug>/            Purchased product content (Markdown), one folder per product — gated, see "Downloads" below
brand/                     Logo/icon SVGs
marketing/                 Hand-written marketing copy (Reddit posts, affiliate template) — NOT served (blocked at /marketing)
openclaw/                  Separate sandboxed daily-cron agent (own Docker image) — see openclaw/README.md
onboarding-ai.ts           Orphaned/unwired prototype — see "Things that look live but aren't" below
migration-onboarding.sql   Orphaned/unwired prototype migration for the same unused onboarding system
.claude/skills/            Project-specific Claude Code skills (screenshot, smoke-test, deploy)
```

There is no build step, no bundler, no frontend framework, and no test suite. `static-server.mjs` is both the server and the templating engine — server-rendered pages are built with JS template literals (see `pageShell()`, `articlePageShell()`, `insiderGatePage()`, `insiderLibraryPage()`).

## Running it locally

```bash
npm install
node static-server.mjs   # npm start does the same thing
```

Listens on `process.env.PORT` (default 8080). Without `STRIPE_SECRET_KEY` set, checkout/webhooks/refunds/downloads/insider all degrade to explicit "not configured" responses rather than crashing — the server is designed to boot with zero env vars for quick local poking at the static pages.

## Two separate runtimes — don't confuse them

1. **Main web service** (`static-server.mjs`, repo root) — the live site, deployed via `railway.toml` (`node static-server.mjs`, healthcheck at `/healthz`).
2. **OpenClaw** (`openclaw/`) — a sandboxed agent with its *own* `package.json`, `Dockerfile`, and `railway.toml`. Runs once a day (cron, not long-running): pulls Stripe sales numbers, drafts a marketing pack and 2 free articles, drafts (but never sends) support-escalation replies and Insider content, and writes a report to `./reports/YYYY-MM-DD.md`. It talks to the main site only over HTTP (`/api/articles`, `/api/og-image`, `/api/insider-content`, `/api/support-escalations`), authenticated with a shared `X-OpenClaw-Token` header that must equal `ARTICLES_API_TOKEN` on **both** services — they're separate Railway services with separate env vars, nothing inherits automatically. Read `openclaw/README.md` before touching it; it documents the sandboxing (no internet except an egress allowlist, no filesystem access outside `./reports`, non-root, read-only root fs) deliberately so the agent can never post to social media, send customer emails, or process refunds itself.

## Adding or editing a product

Products are defined in two places in `static-server.mjs` that **must stay in sync**:

- `PRODUCTS` (~line 37) — name, price in cents, description, optional `stripePriceId` (used instead of inline `price_data` for a few products) or `recurring` (Insider only, makes it a subscription).
- `DOWNLOAD_SETS` (~line 204) — the actual file paths under `bundles/` that get emailed/served after purchase. The comment above it says it explicitly: "Mirrors DOWNLOAD_SETS in index.html — keep both in sync when a bundle's files change." `index.html` also has its own copy used for the post-purchase success-screen download links — check it whenever you touch `DOWNLOAD_SETS`.

When you add a product, also update the smoke-test skill (`.claude/skills/smoke-test-claudecraft/SKILL.md`) — it hardcodes the list of `/checkout/<slug>` paths to test, and its own instructions say to keep that list matching `PRODUCTS`/`DOWNLOAD_SETS`.

## Downloads are gated, not static

`bundles/` is blocked from direct static access (`app.use('/bundles', ...)` returns 403). The only path to a file is `GET /download/:product/:filename?session_id=...`, which calls `stripe.checkout.sessions.retrieve(sessionId)` and checks `payment_status === 'paid'` and that the session's `metadata.product` matches before serving the file. Never add a way to fetch bundle content without that check.

## Money flows (all in `static-server.mjs`)

- **Checkout** — `GET /checkout/:product` creates a Stripe Checkout Session (`mode: 'payment'` for one-time, `mode: 'subscription'` for Insider) and 303-redirects to it.
- **Webhook** — `POST /api/webhooks/stripe` (raw body, must stay registered *before* the global `express.json()` middleware for signature verification to work) handles `checkout.session.completed`: emails download links, notifies `SUPPORT_NOTIFY_EMAIL` of the sale, records the purchase to `purchases.json` (for refund eligibility), credits a referrer if a referral code was used, and mints the buyer their own referral promo code.
- **Self-serve refund** (`POST /api/self-refund`) and **loyalty discount** (`POST /api/loyalty-discount`) are deliberately rules-based, not AI-judgment-based — they only act on a verified purchase recorded by the webhook, refunds are one-time per purchase (not per-email), and loyalty codes are single-use/90-day. Read the comments directly above each handler before changing the eligibility logic.
- **Insider** (`/insider/*`) — email-only access, no passwords: a signed HMAC cookie (`signInsiderCookie`/`verifyInsiderCookie`) gates `/insider/library`, re-verified against a live Stripe subscription lookup on every load (`hasActiveInsiderSubscription`), not just cookie presence.

All of the JSON "database" files (`purchases.json`, `referrals.json`, `subscribers.json`, etc.) live under `ARTICLES_DATA_DIR` (default `/data`) — on Railway this is a persistent volume, not part of the repo. There is no real database (`onboarding-ai.ts`'s Postgres schema is the one exception, and it's unused — see below).

## Internal APIs

`X-OpenClaw-Token` (must equal `ARTICLES_API_TOKEN`) protects `/api/insider-content`, `/api/subscribers`, `/api/support-escalations`, `/api/og-image`, and `POST /api/articles`/`DELETE /api/articles/:id`. These exist for OpenClaw to call, not for the browser — don't relax the auth check to make frontend access easier.

## Things that look live but aren't

`onboarding-ai.ts` and `migration-onboarding.sql` describe a Postgres-backed, day-2/7/14/28 email drip onboarding system referencing an external "AgentBridge". Neither `pg` nor `nodemailer` are in `package.json`, nothing in `static-server.mjs` imports or calls into `onboarding-ai.ts`, and there's no Postgres anywhere in this deployment. Treat both files as an unwired prototype, not part of the live system, until someone actually wires them in — don't assume onboarding emails are currently being sent.

## Conventions

- **No build step.** Edit `static-server.mjs` directly; restart the process to see changes. No TypeScript compilation applies to the live server (the one `.ts` file in the repo is the unwired prototype above).
- **Server-rendered HTML pages** (`/how-it-works.html`, `/reviews.html`, `/faq.html`, `/why-claudecraft.html`, `/bundles.html`, `/articles.html`, `/article/:id`, the Insider pages) are generated by template-literal functions in `static-server.mjs`, sharing `pageShell()` for nav/footer. Pure static pages (homepage, legal pages, ebook) are plain files in the repo root served by `express.static`.
- **Validate email** with the same inline regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) used throughout — there's no shared validator function, it's copy-pasted intentionally for each handler; match the existing pattern rather than introducing a new one.
- **Best-effort email sends** (`sendSupportEmail(...).catch(() => {})`) are used anywhere an email failure shouldn't block the user-facing response (signup, refund confirmation, etc.) — preserve that pattern for new notification sends.
- **Commit style**: short, imperative, present-tense subject lines (e.g. "Gate bundle downloads behind verified purchase", "Fix self-refund to be per-purchase not per-email"). No conventional-commit prefixes required, though `feat:`/`fix:` show up occasionally.
- **Comments are used sparingly** but deliberately mark non-obvious invariants (ordering requirements, security gates, "why not just do X") — match that density; don't add narration comments for self-explanatory code.
- AI model usage: the live site's support-email triage uses `claude-sonnet-4-6` via `@anthropic-ai/sdk`; the homepage chat widget uses Gemini (`gemini-2.0-flash`) with Google Search grounding, gated on `GEMINI_API_KEY`. OpenClaw separately defaults to a cheap OpenRouter model for non-search drafting and falls back to `claude-sonnet-4-6` if no OpenRouter key is set.

## Project-specific Claude Code skills (`.claude/skills/`)

- `deploy-claudecraft` — commit, push to `main`, `railway up` for the `claudecraft` service, poll until deploy resolves, verify with a live curl. Use this for any "deploy/ship it" request rather than improvising the Railway steps.
- `smoke-test-claudecraft` — hits every page, every `/checkout/:product`, and every API endpoint on the live site and reports pass/fail. Run after a deploy. Keep its hardcoded product list in sync with `PRODUCTS`/`DOWNLOAD_SETS`.
- `screenshot-claudecraft` — headless-Chrome screenshot of a live path, for visual before/after checks.

These three are `disable-model-invocation: true`, i.e. only run when explicitly invoked (`/deploy-claudecraft`, etc.), not automatically.
