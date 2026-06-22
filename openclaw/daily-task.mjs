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

const SUPPORT_KB_FOR_REVIEW = `ClaudeCraft sells done-for-you Claude AI skill bundles, one-time payment, no subscription. Policy facts: 30-day money-back guarantee, no questions asked, if the customer installed the bundle and followed the setup guide and didn't save time. Multi-bundle buyers get a 20% discount on additional bundles (email-requested, human-applied). Files never expire and are free to re-send if lost. All bundles work on the free Claude plan.`;

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
  if (!anthropic) return 'Anthropic API not configured — skipped.';
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
    return msg.content[0]?.text || '(no response)';
  } catch (err) {
    return `Could not generate marketing pack: ${err.message}`;
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
- Format: first line is a short, magnetic title (under 12 words, makes someone want to click) and nothing else, then a blank line, then the article body`,
      }],
    });
    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n\n').trim();
    if (!text) return null;
    const lines = text.split('\n');
    const title = lines[0].replace(/^#+\s*/, '').trim();
    const body = lines.slice(1).join('\n').trim();
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
    return `Published successfully: "${article.title}"`;
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
    return { title, body };
  } catch (err) {
    console.log(`Could not draft weekly guide: ${err.message}`);
    return null;
  }
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const dayIndex = new Date().getDay() % SEGMENTS.length;
  const segment = SEGMENTS[dayIndex];

  console.log(`[${today}] Starting daily run. Today's content focus: ${segment.name}`);

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

${draft}

---
*Generated automatically by OpenClaw. The news article and weekly guide publish automatically to ClaudeCraft's own Articles section. Everything else only drafts and reports — never posts publicly, sends messages, or takes any action outside this container.*
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
}

main().catch(err => {
  console.error('OpenClaw daily task failed:', err);
  process.exit(1);
});
