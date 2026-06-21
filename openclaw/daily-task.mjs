import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────
// ClaudeCraft OpenClaw — Daily Ops Agent
//
// What this does, every day: pulls real sales data, auto-publishes one
// genuinely sourced AI news article to ClaudeCraft's free Articles section,
// and drafts a Reddit/marketing idea for human review. On Mondays, it also
// drafts and auto-publishes a deeper free guide (new prompts/tips) to keep
// a steady flow of free content.
//
// What this NEVER does: post to Reddit, social media, send emails/DMs, or
// touch anything outside this container. Publishing to ClaudeCraft's OWN
// site (news + weekly guide) is the one approved automation — third-party
// platform posting always lands in the report for a human to review first.
// ─────────────────────────────────────────────────────────────────────────

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const SEGMENTS = [
  { name: 'Solo Entrepreneur Pack', subreddits: 'r/freelance, r/smallbusiness' },
  { name: 'Content Machine Pack', subreddits: 'r/SocialMediaMarketing, r/NewTubers' },
  { name: '55+ AI Starter Kit', subreddits: 'general AI-curious audiences, not a specific subreddit yet' },
  { name: "Claude Co-Work Beginner's Guide", subreddits: 'r/ClaudeAI, r/artificial' },
  { name: 'Student Success Pack', subreddits: 'r/GetStudying, r/college' },
  { name: "Job Seeker's Career Pack", subreddits: 'r/jobs, r/resumes' },
];

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

async function draftContentIdea(segment, salesContext) {
  if (!anthropic) return 'Anthropic API not configured — skipped.';
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are drafting marketing content ideas for ClaudeCraft, a site selling done-for-you Claude AI skill bundles. Today's focus segment: "${segment.name}" (relevant communities: ${segment.subreddits}).

Recent sales context: ${salesContext}

Write ONE new "problem-first" Reddit-style post draft for this segment — genuine value first (a real, usable Claude prompt relevant to this audience), soft mention of the paid bundle at the end, never a hard sell. Keep it under 250 words. This will be reviewed by a human before ever being posted anywhere — write it as a ready-to-review draft, not a final decision.`,
      }],
    });
    return msg.content[0]?.text || '(no response)';
  } catch (err) {
    return `Could not generate content idea: ${err.message}`;
  }
}

async function draftNewsArticle() {
  if (!anthropic) return null;
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      messages: [{
        role: 'user',
        content: `Search the web for genuinely recent Claude/Anthropic or broader AI industry news from the last few days. Then write a news article (300-450 words) for a general, non-technical audience reading an AI tools site — written to genuinely hook a reader and hold their attention, not just inform them.

Non-negotiable (never break these, no matter how it affects the writing):
- Every claim must be factually accurate to what you actually find in search — never speculate, embellish, or invent a single detail to make it more dramatic
- End with a "Sources:" section listing the real URLs you found, as a plain list
- If you genuinely cannot find anything new/recent via search, say so plainly instead of inventing something

Writing quality (this is what separates this from a generic news blurb):
- Open with a specific, concrete detail or moment — never "In a recent development..." or other throat-clearing
- Write with momentum — short, punchy sentences mixed with longer ones, active voice, no corporate-press-release tone
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

async function publishArticle(article, tag, meta) {
  if (!article || !process.env.ARTICLES_API_TOKEN) return 'Skipped — no article or no ARTICLES_API_TOKEN configured.';
  try {
    const bodyHtml = article.body.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
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
  const draft = await draftContentIdea(segment, sales.text);
  const newsArticle = await draftNewsArticle();
  const newsPublishResult = await publishArticle(newsArticle, 'AI News', 'Daily AI News');

  const isWeeklyRun = new Date().getDay() === 1; // Monday
  let weeklySection = '';
  if (isWeeklyRun) {
    const guide = await draftWeeklyGuide();
    const guidePublishResult = await publishArticle(guide, 'Weekly Guide', 'New This Week — Free');
    weeklySection = `
## Weekly Free Guide (Mondays only)
${guide ? `Title: "${guide.title}"` : '(none drafted)'}
Publish result: ${guidePublishResult}
`;
  }

  const report = `# ClaudeCraft Daily Report — ${today}

## ⚠️ The Reddit/marketing draft below has NOT been posted anywhere — review before posting it yourself.
## The news article (and weekly guide, on Mondays) WAS auto-published to the live Articles section — that's the approved automation, since it's our own site, not a third-party platform.

## Sales — Last 24 Hours
${sales.text}

## Daily AI News Article
${newsArticle ? `Title: "${newsArticle.title}"` : '(none drafted)'}
Publish result: ${newsPublishResult}
${weeklySection}
## Today's Drafted Reddit/Marketing Idea (focus: ${segment.name}) — NOT POSTED, review first

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
