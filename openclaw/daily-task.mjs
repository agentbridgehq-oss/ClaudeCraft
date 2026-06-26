import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────
// ClaudeCraft OpenClaw — Daily Ops Agent
//
// What this does, every day: pulls real sales data, reviews the support
// escalation queue and drafts a suggested reply + refund/discount
// recommendation for each (for a human to read and act on), auto-publishes
// TWO genuinely sourced articles to ClaudeCraft's free Articles section —
// one Claude/Anthropic-specific update, one broader AI industry news piece
// — and drafts a full daily marketing pack (Reddit post, X/Twitter thread,
// LinkedIn post) for human review. On Mondays, it
// also drafts and auto-publishes a deeper free guide (new prompts/tips) to
// keep a steady flow of free content.
//
// What this NEVER does: post to Reddit, social media, send emails/DMs to
// customers, issue refunds, apply discounts, or touch anything outside
// this container. Publishing to ClaudeCraft's OWN site (news + weekly
// guide) is the one approved automation — everything customer-facing
// (replies, refunds, discounts) is drafted only and always lands in the
// report for a human to review, edit, and execute themselves.
// ─────────────────────────────────────────────────────────────────────────

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const SUPPORT_KB_FOR_REVIEW = `ClaudeCraft sells done-for-you Claude AI skill bundles, one-time payment, no subscription. Policy facts: 30-day money-back guarantee, no questions asked — fully self-serve and automatic at /refund.html, so it never needs human action. Multi-bundle buyers get a 20% discount on additional bundles — also fully self-serve and automatic at /discount.html. Files never expire and are free to re-send if lost. All bundles work on the free Claude plan. Escalations reaching this queue are the cases that don't fit those two automated flows (file re-sends, disputes, complaints, anything ambiguous).`;

const SEGMENTS = [
  { name: 'Solo Entrepreneur Pack', subreddits: 'r/freelance, r/smallbusiness' },
  { name: 'Content Machine Pack', subreddits: 'r/SocialMediaMarketing, r/NewTubers' },
  { name: '55+ AI Starter Kit', subreddits: 'general AI-curious audiences, not a specific subreddit yet' },
  { name: "Claude Co-Work Beginner's Guide", subreddits: 'r/ClaudeAI, r/artificial' },
  { name: 'Student Success Pack', subreddits: 'r/GetStudying, r/college' },
  { name: "Job Seeker's Career Pack", subreddits: 'r/jobs, r/resumes' },
];

async function reviewSupportEscalations() {
  if (!anthropic || !process.env.ARTICLES_API_TOKEN) return 'Skipped — Anthropic or ARTICLES_API_TOKEN not configured.';
  try {
    const base = process.env.PUBLIC_BASE_URL || 'https://claudecraft-production.up.railway.app';
    const res = await fetch(`${base}/api/support-escalations`, {
      headers: { 'X-OpenClaw-Token': process.env.ARTICLES_API_TOKEN },
    });
    if (!res.ok) return `Could not fetch escalations: ${res.status}`;
    const escalations = await res.json();
    if (!Array.isArray(escalations) || escalations.length === 0) return 'No pending support escalations — inbox is clear.';

    // Only the 5 most recent — keeps this fast and cheap, and a human should see new ones same-day anyway.
    const recent = escalations.slice(0, 5);
    const drafts = [];
    for (const e of recent) {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `${SUPPORT_KB_FOR_REVIEW}\n\nA customer support email was escalated to a human. Here it is:\n\nFrom: ${e.from}\nSubject: ${e.subject}\nBody: ${e.body}\n\nAI's internal note from initial triage: ${e.internalNote}\n\nDraft TWO things for the human reviewing this (this is a recommendation only — nothing will be sent or processed automatically):\n1. A ready-to-send reply the human can copy/edit/send themselves\n2. A clear refund/discount/action recommendation: state plainly whether this looks like a legitimate request that fits ClaudeCraft's 30-day guarantee policy, and what specific action (refund amount, discount %, file re-send) the human should consider taking — or say clearly if you're not confident and why.\n\nFormat as:\nSUGGESTED REPLY:\n<reply text>\n\nRECOMMENDATION:\n<your recommendation>`,
        }],
      });
      const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      drafts.push(`### From: ${e.from} — "${e.subject}" (received ${e.receivedAt})\n${text}`);
    }
    return drafts.join('\n\n---\n\n');
  } catch (err) {
    return `Could not review escalations: ${err.message}`;
  }
}

// ── Quality control master agent ────────────────────────────────────────────
// Every piece of marketing material — articles, the weekly guide, Reddit/X/
// LinkedIn drafts — passes through here before it's allowed to publish or be
// marked ready-to-post. This is content-quality review only; it does NOT
// make external posting safe on its own (see the posting restriction at the
// top of this file) — it just means nothing low-quality or inaccurate gets
// auto-published to our own site, and nothing reaches the report marked
// "ready" unless it actually clears a real bar first.
async function qualityCheck(content, contentType, context) {
  if (!anthropic || !content) return { approved: true, score: null, note: 'Quality check skipped — Anthropic not configured or no content.' };
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You are ClaudeCraft's senior marketing quality-control reviewer — an expert across copywriting, SEO, online business, blogs, articles, social posts, landing pages, ad copy, and brand voice. ClaudeCraft sells done-for-you Claude AI skill bundles and wants a premium, trustworthy brand feel — never cheap, hypey, spammy, or "AI slop."

Review this ${contentType} before it's allowed to go out:
---
${content}
---
${context ? `Context: ${context}\n` : ''}
Check: factual accuracy (no fabricated stats/claims), genuine usefulness (not just a pitch), tone (confident and premium, not cheap or spammy), platform fit, whether the headline/opening line is an actual clean headline and NOT leftover internal reasoning or meta-commentary (e.g. "I have two stories to choose from...", "Let me write about...") — reject immediately if so, whether it actually serves ClaudeCraft's goal of driving genuine reader interest back to the brand (a soft, natural connection — a relevant mention, a closing nudge to claudecraft.ca, or a bundle reference when genuinely on-topic — is good; completely generic content with zero tie-back anywhere should lower the score even if otherwise well-written), and anything that could embarrass the brand or get flagged as spam.

Respond with ONLY this JSON, nothing else: {"approved": true or false, "score": 1-10, "feedback": "one or two specific sentences"}`,
      }],
    });
    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
    return { approved: !!parsed.approved, score: parsed.score ?? null, note: parsed.feedback || '' };
  } catch (err) {
    return { approved: false, score: null, note: `Quality check itself failed to run (${err.message}) — treated as not-approved out of caution.` };
  }
}

// Catches the specific failure mode seen in production: the model's first line was leftover
// internal reasoning ("I have two stories to choose from...") instead of a real headline, and
// it slipped past the AI quality check too. This is a cheap, deterministic backstop — checked
// in addition to (not instead of) qualityCheck above.
const REASONING_LEAK_PATTERNS = [
  /^i (have|need|want|should|'ll|will|am going to)\b/i,
  /\blet me\b/i,
  /\bi('ll| will) (write|choose|pick|go with|focus on)\b/i,
  /\b(stories?|options?) to choose from\b/i,
  /^(okay|alright|sure)[,.]/i,
];
function looksLikeReasoningLeak(title) {
  if (!title || title.length > 140) return true;
  return REASONING_LEAK_PATTERNS.some(p => p.test(title));
}

// Deterministic fact-verification backstop: a "Sources:" section with fabricated or dead
// URLs is the clearest possible sign an AI-written news article made something up. This
// doesn't re-check every claim against the source content (that's a much bigger problem),
// but it catches the cheap, common failure mode — invented or hallucinated citations —
// without trusting the model to grade its own homework on accuracy.
async function verifySourcesReachable(body) {
  const urls = [...body.matchAll(/https?:\/\/[^\s<>")\]]+/g)].map(m => m[0].replace(/[.,;]+$/, ''));
  if (urls.length === 0) return { ok: false, reason: 'No source URLs found in the article body — cannot verify it against real reporting.' };
  const checks = await Promise.all(urls.slice(0, 8).map(async url => {
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8000) });
      if (res.ok) return true;
      const res2 = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(8000) });
      return res2.ok;
    } catch {
      return false;
    }
  }));
  const liveCount = checks.filter(Boolean).length;
  if (liveCount === 0) return { ok: false, reason: `None of the ${urls.length} cited source URL(s) were actually reachable — likely fabricated.` };
  return { ok: true, reason: `${liveCount}/${urls.length} cited source URL(s) verified reachable.` };
}

// ── Health check — notify-only, never auto-fixes or auto-deploys anything ──
// Catches the cheap, high-signal failure modes: site down, Stripe unreachable,
// recent declined/failed payments worth a glance, required keys missing in
// this container. Anything it finds just gets flagged at the top of the
// report for a human to investigate — same drafting-not-executing pattern
// as the rest of OpenClaw.
async function checkSystemHealth() {
  const issues = [];
  const base = process.env.PUBLIC_BASE_URL || 'https://claudecraft-production.up.railway.app';
  try {
    const res = await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) issues.push(`Site health check failed: HTTP ${res.status} from ${base}/healthz`);
  } catch (err) {
    issues.push(`Site unreachable at ${base}: ${err.message}`);
  }

  if (stripe) {
    try {
      const since = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
      const failed = await stripe.events.list({ type: 'payment_intent.payment_failed', created: { gte: since }, limit: 10 });
      if (failed.data.length > 0) issues.push(`${failed.data.length} failed payment attempt(s) in the last 24h (could just be declined cards — worth a glance in Stripe).`);
    } catch (err) {
      issues.push(`Could not reach Stripe API: ${err.message}`);
    }
  } else {
    issues.push('STRIPE_SECRET_KEY not set in this container.');
  }

  const requiredKeys = ['ANTHROPIC_API_KEY', 'STRIPE_SECRET_KEY', 'ARTICLES_API_TOKEN', 'PUBLIC_BASE_URL'];
  const missing = requiredKeys.filter(k => !process.env[k]);
  if (missing.length) issues.push(`Missing env vars in this container: ${missing.join(', ')}`);

  return issues.length === 0
    ? '✅ All clear — site reachable, Stripe reachable, no failed payments, all required keys present.'
    : '⚠️ ' + issues.join(' | ');
}

async function getSalesSummary() {
  if (!stripe) return { available: false, text: 'Stripe not configured — skipped.' };
  try {
    const since = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    const sessions = await stripe.checkout.sessions.list({ created: { gte: since }, limit: 100 });
    const paid = sessions.data.filter(s => s.payment_status === 'paid');
    const total = paid.reduce((sum, s) => sum + (s.amount_total || 0), 0) / 100;
    return {
      available: true,
      count: paid.length,
      totalRevenue: total,
      text: paid.length === 0
        ? 'No completed sales in the last 24 hours.'
        : `${paid.length} sale(s) in the last 24 hours, totaling $${total.toFixed(2)}.`,
    };
  } catch (err) {
    return { available: false, text: `Could not fetch sales data: ${err.message} (check the restricted key has Checkout Sessions: Read permission)` };
  }
}

async function draftMarketingPack(segment, salesContext) {
  if (!anthropic) return { text: 'Anthropic API not configured — skipped.', approved: false, score: null, note: '' };
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are drafting a daily marketing content pack for ClaudeCraft, a site selling done-for-you Claude AI skill bundles. Today's focus segment: "${segment.name}" (relevant Reddit communities: ${segment.subreddits}).

Recent sales context: ${salesContext}

This is FREE drafting only — none of this gets posted automatically. A human reads, edits, and decides whether/where to post each piece themselves. Write all three of the following, clearly labeled, all built around ONE genuinely useful Claude prompt relevant to this segment (give real value first, every time — soft bundle mention only at the end, never a hard sell, never identical wording across the three so it doesn't look copy-pasted):

REDDIT POST (for ${segment.subreddits}):
A "problem-first" post, under 250 words. Reddit audiences punish anything that smells like an ad — this needs to read like a genuinely helpful person sharing something that worked for them, not marketing copy.

X / TWITTER THREAD:
A 4-6 tweet thread. Tweet 1 is the hook (must work as a standalone tweet, no "thread below 👇" crutch). Each subsequent tweet stands on its own. Short, punchy, no hashtag spam (max 1-2 relevant ones, only if natural).

LINKEDIN POST:
Slightly more professional tone than the other two, 150-200 words, framed around a work/productivity angle. Skip if this segment genuinely doesn't fit LinkedIn (e.g. a casual everyday-life segment) — say so plainly instead of forcing it.`,
      }],
    });
    const text = msg.content[0]?.text || '(no response)';
    const qc = await qualityCheck(text, 'a daily marketing content pack (Reddit + X + LinkedIn post)', `Focus segment: ${segment.name}`);
    return { text, approved: qc.approved, score: qc.score, note: qc.note };
  } catch (err) {
    return { text: `Could not generate marketing pack: ${err.message}`, approved: false, score: null, note: '' };
  }
}

async function draftNewsArticle(focus) {
  if (!anthropic) return null;
  const focusLine = focus === 'claude'
    ? 'Search specifically for genuinely recent Claude/Anthropic news — new model releases, feature launches, product updates, or notable Anthropic announcements from the last few days.'
    : 'Search for genuinely recent broader AI industry news from the last few days — NOT Anthropic/Claude-specific (that runs as a separate article) — competitor model releases, AI policy/industry shifts, or notable AI tools/research.';
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      messages: [{
        role: 'user',
        content: `${focusLine} Then write a news article (300-450 words) for a general, non-technical audience reading an AI tools site — written to genuinely hook a reader and hold their attention, not just inform them.

Non-negotiable (never break these, no matter how it affects the writing):
- Every claim must be factually accurate to what you actually find in search — never speculate, embellish, or invent a single detail to make it more dramatic
- End with a "Sources:" section listing the real URLs you found, as a plain list
- If you genuinely cannot find anything new/recent via search, say so plainly instead of inventing something

Writing quality (this is what separates this from a generic news blurb — write like the best AI-news YouTubers, not a press release):
- Open with a specific, concrete detail or moment — never "In a recent development..." or other throat-clearing
- Write with momentum — short, punchy sentences mixed with longer ones, active voice, no corporate-press-release tone
- Don't just report what happened — give an honest, opinionated take on what it actually means and whether it's worth the reader's attention, the way a trusted analyst would, not a neutral wire report
- If it's a new tool or feature, be concrete about what someone could actually DO with it today — practical, not hypothetical
- Make the reader feel why this actually matters to THEM, not just what happened
- Close with ONE natural, low-pressure sentence connecting back to ClaudeCraft — a relevant skill bundle when genuinely on-topic, or simply a line inviting the reader to browse claudecraft.ca — never a hard sell, and skip it entirely if there's truly no honest connection for this specific story
- Format: first line is ONLY the final, polished headline (under 12 words, makes someone want to click) — never your reasoning about which story to pick, never "I have two stories..." or any other meta-commentary about the writing process itself. The very first line a reader sees must already be the finished headline.`,
      }],
    });
    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n\n').trim();
    if (!text) return null;
    const lines = text.split('\n');
    const title = lines[0].replace(/^#+\s*/, '').trim();
    const body = lines.slice(1).join('\n').trim();
    if (looksLikeReasoningLeak(title)) {
      console.log(`Discarded a drafted article — headline looked like a reasoning leak, not a real title: "${title.slice(0, 100)}"`);
      return null;
    }
    const sourceCheck = await verifySourcesReachable(body);
    if (!sourceCheck.ok) {
      console.log(`Discarded a drafted article — source verification failed: ${sourceCheck.reason}`);
      return null;
    }
    console.log(`Source verification passed: ${sourceCheck.reason}`);
    return { title, body };
  } catch (err) {
    console.log(`Could not draft news article: ${err.message}`);
    return null;
  }
}

async function generateImageBase64(prompt, aspectRatio) {
  if (!process.env.GOOGLE_API_KEY) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: aspectRatio || '1:1' },
        }),
      }
    );
    if (!res.ok) {
      console.log(`Image generation failed: ${res.status} ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    return data?.predictions?.[0]?.bytesBase64Encoded || null;
  } catch (err) {
    console.log(`Could not generate image: ${err.message}`);
    return null;
  }
}

async function generateArticleImage(title) {
  const b64 = await generateImageBase64(
    `A clean, modern editorial header illustration for an article titled "${title}". Dark background, orange accent color, minimal tech/AI aesthetic, no text in the image.`,
    '16:9'
  );
  return b64 ? `data:image/png;base64,${b64}` : null;
}

async function refreshShareImage() {
  if (!process.env.ARTICLES_API_TOKEN) return 'Skipped — no ARTICLES_API_TOKEN configured.';
  const b64 = await generateImageBase64(
    'A premium, polished social-media share card for "ClaudeCraft", a site selling done-for-you Claude AI skill bundles. Deep navy/black background with a warm orange glow, modern minimal tech aesthetic, no text or logos in the image, clean negative space suitable for a title to be overlaid by the site itself.',
    '16:9'
  );
  if (!b64) return 'Could not generate a share image this run — site keeps using whatever image (if any) was published previously.';
  try {
    const base = process.env.PUBLIC_BASE_URL || 'https://claudecraft-production.up.railway.app';
    const res = await fetch(`${base}/api/og-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-OpenClaw-Token': process.env.ARTICLES_API_TOKEN },
      body: JSON.stringify({ imageBase64: b64 }),
    });
    if (!res.ok) return `Publish failed: ${res.status} ${await res.text()}`;
    return 'Published a fresh social share image to /og-image.png.';
  } catch (err) {
    return `Could not publish share image: ${err.message}`;
  }
}

async function publishArticle(article, tag, meta) {
  if (!article || !process.env.ARTICLES_API_TOKEN) return 'Skipped — no article or no ARTICLES_API_TOKEN configured.';
  const qc = await qualityCheck(`${article.title}\n\n${article.body}`, 'news/guide article for ClaudeCraft\'s own public Articles section', `Section: ${tag}`);
  if (!qc.approved) return `REJECTED by quality control (score ${qc.score ?? '?'}/10) — NOT published. Reason: ${qc.note}`;
  try {
    const imageDataUrl = await generateArticleImage(article.title);
    const imageHtml = imageDataUrl ? `<img src="${imageDataUrl}" alt="" style="width:100%;border-radius:12px;margin-bottom:16px;display:block;">` : '';
    const bodyHtml = imageHtml + article.body.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    const res = await fetch(`${process.env.PUBLIC_BASE_URL || 'https://claudecraft-production.up.railway.app'}/api/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-OpenClaw-Token': process.env.ARTICLES_API_TOKEN },
      body: JSON.stringify({ tag, title: article.title, meta, bodyHtml }),
    });
    if (!res.ok) return `Publish failed: ${res.status} ${await res.text()}`;
    return `Published successfully: "${article.title}" — quality control score ${qc.score ?? '?'}/10 (${qc.note})`;
  } catch (err) {
    return `Could not publish article: ${err.message}`;
  }
}

const WEEKLY_GUIDE_TOPICS = [
  'A new, genuinely useful Claude prompt for everyday productivity (not tied to any specific paid bundle) — explain what it does and give the full copy-pasteable prompt.',
  'A deeper explainer on a specific Claude feature (Projects, Artifacts, file uploads, or web search) — written for someone who has never tried it.',
  'A "5 new prompts this week" roundup across different everyday use cases (writing, planning, learning, research) — short, scannable, all copy-pasteable.',
  'A tips guide on getting better results from any AI assistant (not just Claude) — prompting habits, common mistakes, practical examples.',
  'A guide comparing two ways of doing the same task with Claude (e.g. two different prompt styles) and explaining which works better and why.',
];

async function draftWeeklyGuide() {
  if (!anthropic) return null;
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const topic = WEEKLY_GUIDE_TOPICS[weekNumber % WEEKLY_GUIDE_TOPICS.length];
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1600,
      messages: [{
        role: 'user',
        content: `You are writing a free, genuinely useful guide for ClaudeCraft's "Articles" section (a site that also sells done-for-you Claude skill bundles, but this piece is 100% free standalone value — no pitch, no bundle mention). This week's topic: ${topic}

Write a complete guide (450-750 words) for a non-technical, everyday reader — written with enough quality and pull that someone reads the whole thing and comes back next week for more, not just skims it.

- Open with a concrete scene, a specific relatable moment, or a sharp claim — never "In this guide, we will..."
- Be specific and practical throughout — real, vivid examples over generic advice, at every step, not just the opener
- Write with momentum and personality, like a sharp person explaining something they're genuinely excited about — never like a corporate help-center article
- Never sacrifice accuracy or usefulness for style — every technique or claim must actually work as described
- Format: first line is a short, magnetic title (under 12 words) and nothing else, then a blank line, then the guide body using clear paragraphs.`,
      }],
    });
    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n\n').trim();
    if (!text) return null;
    const lines = text.split('\n');
    const title = lines[0].replace(/^#+\s*/, '').trim();
    const body = lines.slice(1).join('\n').trim();
    if (looksLikeReasoningLeak(title)) {
      console.log(`Discarded a drafted weekly guide — headline looked like a reasoning leak, not a real title: "${title.slice(0, 100)}"`);
      return null;
    }
    return { title, body };
  } catch (err) {
    console.log(`Could not draft weekly guide: ${err.message}`);
    return null;
  }
}

async function emailDailyReport(report, today) {
  if (!process.env.RESEND_API_KEY || !process.env.SUPPORT_NOTIFY_EMAIL) {
    return 'Skipped — RESEND_API_KEY and/or SUPPORT_NOTIFY_EMAIL not configured, report only logged.';
  }
  try {
    const html = '<pre style="font-family:monospace;white-space:pre-wrap;font-size:13px;line-height:1.5;">' +
      report.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: process.env.SUPPORT_FROM_EMAIL || 'ClaudeCraft OpenClaw <support@claudecraft.ca>',
        to: process.env.SUPPORT_NOTIFY_EMAIL,
        subject: `ClaudeCraft Daily Report — ${today}`,
        text: report,
        html,
      }),
    });
    if (!res.ok) return `Email send failed: ${res.status} ${await res.text()}`;
    return `Emailed to ${process.env.SUPPORT_NOTIFY_EMAIL}.`;
  } catch (err) {
    return `Email send error: ${err.message}`;
  }
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const dayIndex = new Date().getDay() % SEGMENTS.length;
  const segment = SEGMENTS[dayIndex];

  console.log(`[${today}] Starting daily run. Today's content focus: ${segment.name}`);

  const health = await checkSystemHealth();
  const sales = await getSalesSummary();
  const escalationReview = await reviewSupportEscalations();
  const draft = await draftMarketingPack(segment, sales.text);
  const claudeArticle = await draftNewsArticle('claude');
  const claudePublishResult = await publishArticle(claudeArticle, 'Claude Tech', 'Daily Claude Update');
  const aiArticle = await draftNewsArticle('ai');
  const aiPublishResult = await publishArticle(aiArticle, 'AI News', 'Daily AI News');

  const isWeeklyRun = new Date().getDay() === 1; // Monday
  let weeklySection = '';
  if (isWeeklyRun) {
    const guide = await draftWeeklyGuide();
    const guidePublishResult = await publishArticle(guide, 'Weekly Guide', 'New This Week — Free');
    const shareImageResult = await refreshShareImage();
    weeklySection = `
## Weekly Free Guide (Mondays only)
${guide ? `Title: "${guide.title}"` : '(none drafted)'}
Publish result: ${guidePublishResult}

## Weekly Social Share Image Refresh (Mondays only)
${shareImageResult}
`;
  }

  const report = `# ClaudeCraft Daily Report — ${today}

## ⚠️ The Reddit/marketing draft below has NOT been posted anywhere — review before posting it yourself.
## The news article (and weekly guide, on Mondays) WAS auto-published to the live Articles section — that's the approved automation, since it's our own site, not a third-party platform.

## System Health Check
${health}

## Sales — Last 24 Hours
${sales.text}

## ⚠️ Support Escalations — Drafted Replies & Recommendations (NOT sent, NOT processed — review and act yourself)
${escalationReview}

## Daily Claude Tech Article
${claudeArticle ? `Title: "${claudeArticle.title}"` : '(none drafted — no genuinely recent Claude news found, or search/API unavailable)'}
Publish result: ${claudePublishResult}

## Daily AI News Article
${aiArticle ? `Title: "${aiArticle.title}"` : '(none drafted — no genuinely recent AI news found, or search/API unavailable)'}
Publish result: ${aiPublishResult}
${weeklySection}
## Today's Marketing Pack — Reddit + X Thread + LinkedIn (focus: ${segment.name}) — NOT POSTED anywhere, copy/edit/post yourself
Quality control: ${draft.approved ? `✅ APPROVED (score ${draft.score ?? '?'}/10) — ${draft.note}` : `❌ REJECTED (score ${draft.score ?? '?'}/10) — ${draft.note} — do not post as-is, revise first`}

${draft.text}

---
*Generated automatically by OpenClaw. Every article, guide, and marketing draft is reviewed by a quality-control pass before it's published or marked ready — rejected pieces are flagged above, not silently used. The news article and weekly guide publish automatically to ClaudeCraft's own Articles section. Everything else only drafts and reports — never posts publicly, sends messages, or takes any action outside this container.*
`;

  // Print the full report to stdout — on Railway, view it anytime with:
  //   railway logs --deployment <id> (or the latest cron run in the dashboard)
  // Also write it to disk for the local-Docker option, where a volume persists it.
  console.log('\n' + '='.repeat(60));
  console.log(report);
  console.log('='.repeat(60) + '\n');

  try {
    const reportsDir = path.join(process.cwd(), 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(path.join(reportsDir, `${today}.md`), report);
  } catch (err) {
    console.log('(Skipped writing report to disk — fine on Railway, expected if the filesystem is read-only or ephemeral.)');
  }

  const emailResult = await emailDailyReport(report, today);
  console.log(`Daily report email: ${emailResult}`);
}

main().catch(err => {
  console.error('OpenClaw daily task failed:', err);
  process.exit(1);
});
