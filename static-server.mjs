import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 8080;

const DATA_DIR = process.env.ARTICLES_DATA_DIR || '/data';
const ARTICLES_PATH = path.join(DATA_DIR, 'articles.json');
const REFERRALS_PATH = path.join(DATA_DIR, 'referrals.json');
const REFERRAL_COUPON_ID_PATH = path.join(DATA_DIR, 'referral-coupon-id.txt');
const SUBSCRIBERS_PATH = path.join(DATA_DIR, 'subscribers.json');
const SUPPORT_ESCALATIONS_PATH = path.join(DATA_DIR, 'support-escalations.json');
const PURCHASES_PATH = path.join(DATA_DIR, 'purchases.json');
const REFUND_LOG_PATH = path.join(DATA_DIR, 'refund-log.json');
const OG_IMAGE_PATH = path.join(DATA_DIR, 'og-image.png');
const REFUND_WINDOW_DAYS = 30;
const MAX_DYNAMIC_ARTICLES = 90; // a few months of daily content before the oldest roll off

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://claudecraft.ca';

const PRODUCTS = {
  solo: { name: 'Solo Entrepreneur Pack', amount: 4900, description: '15 done-for-you Claude skills + bonus, for running a solo business.' },
  content: { name: 'Content Machine Pack', amount: 3900, description: '12 done-for-you Claude skills + bonus, for content creators.' },
  starter: { name: '55+ AI Starter Kit', amount: 2900, description: '10 done-for-you Claude skills for everyday life, senior-friendly.' },
  cowork: { name: "Claude Co-Work Beginner's Guide", amount: 1900, description: 'A complete 8-part, step-by-step guide to working with Claude every day.' },
  student: { name: 'Student Success Pack', amount: 3400, description: '12 done-for-you Claude skills + bonus, for academic life.' },
  jobseeker: { name: "Job Seeker's Career Pack", amount: 3400, description: '12 done-for-you Claude skills + bonus, for resumes, interviews, and the job search.' },
  poweruser: { name: 'Claude Power User Pack', amount: 2900, description: '8 advanced skills: real Claude Skills format, token efficiency, agentic workflows, and more.' },
  money: { name: 'Money Mastery Pack', amount: 3400, description: '10 done-for-you Claude skills for budgeting, debt payoff, investing basics, and everyday financial planning.' },
  vault: { name: 'Claude Power Prompts Vault', amount: 900, description: '50 advanced Claude prompts and multi-step workflows — the perfect cheap add-on to any bundle.' },
  startup: { name: "Startup Founder's Toolkit", amount: 3900, description: '10 done-for-you Claude skills for pitching, fundraising math, cofounder conflict, and the high-stakes moments of building a company.' },
  family: { name: 'Family Life Pack', amount: 3400, description: '10 done-for-you Claude skills for meal planning, tough conversations, schedules, and the daily mental load of parenting.' },
  connected: { name: 'Claude Connected Pack', amount: 3900, description: '8 guided workflows for using Claude with real Gmail, Calendar, Drive, Slack, and Notion connectors.' },
  writer: { name: "Creative Writer's Pack", amount: 3400, description: '10 done-for-you Claude skills for fiction and long-form writing — outlining, character work, line edits, and querying.' },
};

function loadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}
function saveJson(filePath, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
const loadArticles = () => loadJson(ARTICLES_PATH, []);
const saveArticles = articles => saveJson(ARTICLES_PATH, articles);
const loadReferrals = () => loadJson(REFERRALS_PATH, { bySession: {}, processedSessions: [] });
const saveReferrals = data => saveJson(REFERRALS_PATH, data);
const loadSubscribers = () => loadJson(SUBSCRIBERS_PATH, []);
const saveSubscribers = data => saveJson(SUBSCRIBERS_PATH, data);
const loadEscalations = () => loadJson(SUPPORT_ESCALATIONS_PATH, []);
const saveEscalations = data => saveJson(SUPPORT_ESCALATIONS_PATH, data);
const loadPurchases = () => loadJson(PURCHASES_PATH, []);
const savePurchases = data => saveJson(PURCHASES_PATH, data);
const loadRefundLog = () => loadJson(REFUND_LOG_PATH, []);
const saveRefundLog = data => saveJson(REFUND_LOG_PATH, data);

// ── AI support inbox knowledge base — kept narrow and factual on purpose ──
const SUPPORT_KB = `You are the support AI for ClaudeCraft (claudecraft.ca), which sells done-for-you Claude AI skill bundles.

Products: ${Object.entries(PRODUCTS).map(([k, p]) => `${p.name} ($${(p.amount / 100).toFixed(2)}) — ${p.description}`).join('; ')}.

How it works: One-time payment via Stripe, no subscription. Each bundle is a set of ready-to-paste Claude prompts/Custom Instructions ("skills") — setup is: claude.ai → Projects → New Project → Custom Instructions → paste the skill text → Save. One skill per Project. After checkout, the buyer is redirected back to the site with working download links shown immediately on the success screen.

Referral program: every buyer gets a personal 10%-off code to share. When someone uses it, the original referrer gets a $10 account credit automatically.

There's also a free "Articles" section on the site with daily AI news and a weekly free guide — no purchase needed.

Published policies (you may confirm these exist, but never personally execute them — see ESCALATE rule below): 30-day no-questions-asked money-back guarantee; free skill updates forever for past buyers; a 20% discount on additional bundles for existing customers who email in.

Your job: read the inbound customer email and decide ONE of two things:
1. EASY — general "how do I use this / what's included / how does the referral code work" questions you can answer confidently using ONLY the facts above, where no money, refund, discount code, or file re-send needs to actually happen. Write a short, warm, accurate reply signed "— ClaudeCraft Support".
2. ESCALATE — refunds, the 20% discount, re-sending/replacing files, billing disputes, chargebacks, complaints, anger/frustration, or anything you're not fully confident about. For these, you may confirm in your reply that the policy applies and they're covered (e.g. "you're covered under our 30-day guarantee") but NEVER say the refund/discount/file has already been sent — only a human can actually execute that. Say a person will follow up within 24 hours to complete it.

Respond with ONLY valid JSON, no markdown fences: {"category": "EASY" or "ESCALATE", "reply": "the customer-facing reply text if EASY, or a short polite holding reply if ESCALATE (e.g. confirming receipt and that a person will follow up within 24 hours)", "internalNote": "one sentence on why, for the human reviewing escalations"}`;

function verifyResendSignature(req) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return false;
  const id = req.get('svix-id');
  const timestamp = req.get('svix-timestamp');
  const signatureHeader = req.get('svix-signature');
  if (!id || !timestamp || !signatureHeader) return false;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const signedContent = `${id}.${timestamp}.${req.body}`;
  const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');
  return signatureHeader.split(' ').some(part => {
    const sig = part.split(',')[1];
    return sig && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  });
}

async function sendSupportEmail(to, subject, text, html) {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: process.env.SUPPORT_FROM_EMAIL || 'ClaudeCraft Support <support@claudecraft.ca>',
        to,
        subject,
        text,
        ...(html ? { html } : {}),
      }),
    });
    if (!res.ok) console.error('Resend send failed:', res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error('Resend send error:', err.message);
    return false;
  }
}

// Mirrors DOWNLOAD_SETS in index.html — keep both in sync when a bundle's files change.
const DOWNLOAD_SETS = {
  solo: { files: ['bundles/solo-entrepreneur-pack/SKILLS.md', 'bundles/solo-entrepreneur-pack/SETUP-GUIDE.md'] },
  content: { files: ['bundles/content-machine-pack/SKILLS.md', 'bundles/content-machine-pack/SETUP-GUIDE.md'] },
  starter: { files: ['bundles/starter-kit/SKILLS.md', 'bundles/starter-kit/SETUP-GUIDE.md'] },
  cowork: { files: ['bundles/cowork-beginners-guide/CLAUDE-COWORK-GUIDE.md', 'bundles/cowork-beginners-guide/QUICK-START-CHECKLIST.md'] },
  student: { files: ['bundles/student-success-pack/SKILLS.md', 'bundles/student-success-pack/SETUP-GUIDE.md'] },
  jobseeker: { files: ['bundles/job-seekers-career-pack/SKILLS.md', 'bundles/job-seekers-career-pack/SETUP-GUIDE.md'] },
  poweruser: { files: ['bundles/power-user-pack/SKILLS.md', 'bundles/power-user-pack/SETUP-GUIDE.md'] },
  money: { files: ['bundles/money-mastery-pack/SKILLS.md', 'bundles/money-mastery-pack/SETUP-GUIDE.md'] },
  vault: { files: ['bundles/power-prompts-vault/PROMPTS-VAULT.md'] },
  startup: { files: ['bundles/startup-founders-toolkit/SKILLS.md', 'bundles/startup-founders-toolkit/SETUP-GUIDE.md'] },
  family: { files: ['bundles/family-life-pack/SKILLS.md', 'bundles/family-life-pack/SETUP-GUIDE.md'] },
  connected: { files: ['bundles/claude-connected-pack/SKILLS.md', 'bundles/claude-connected-pack/SETUP-GUIDE.md'] },
  writer: { files: ['bundles/creative-writers-pack/SKILLS.md', 'bundles/creative-writers-pack/SETUP-GUIDE.md'] },
};

async function sendPurchaseEmail(toEmail, productSlug, productName) {
  const set = DOWNLOAD_SETS[productSlug];
  if (!toEmail || !set) return;
  const links = set.files.map(f => `${BASE_URL}/${f}`);
  const text = `Thanks for buying ${productName}!\n\nYour download links:\n${links.join('\n')}\n\nKeep this email — these links work any time, no login needed. Questions? Reply to this email or contact support@claudecraft.ca.`;
  const html = `<p>Thanks for buying <strong>${productName}</strong>!</p><p>Your download links:</p><ul>${links.map(l => `<li><a href="${l}">${l}</a></li>`).join('')}</ul><p>Keep this email — these links work any time, no login needed. Questions? Reply to this email or contact support@claudecraft.ca.</p>`;
  await sendSupportEmail(toEmail, `Your ${productName} download links`, text, html);
}

async function getOrCreateReferralCoupon() {
  try {
    const cached = fs.readFileSync(REFERRAL_COUPON_ID_PATH, 'utf8').trim();
    if (cached) return cached;
  } catch {}
  const coupon = await stripe.coupons.create({ percent_off: 10, duration: 'once', name: 'ClaudeCraft Referral — 10% Off' });
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(REFERRAL_COUPON_ID_PATH, coupon.id);
  return coupon.id;
}

// ── Stripe webhook — MUST come before express.json() since it needs the raw body for signature verification ──
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(500).send('Webhook not configured');

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send('Invalid signature');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const referrals = loadReferrals();

    if (!referrals.processedSessions.includes(session.id)) {
      try {
        // 0. Email the buyer their download links — the success-page redirect is the only other place these show.
        const productSlug = session.metadata?.product;
        const buyerEmail = session.customer_details?.email;
        if (productSlug && buyerEmail && PRODUCTS[productSlug]) {
          await sendPurchaseEmail(buyerEmail, productSlug, PRODUCTS[productSlug].name);
        }

        // 0.5. Record the purchase so the self-serve refund flow can verify eligibility later.
        if (productSlug && buyerEmail && session.payment_intent) {
          const purchases = loadPurchases();
          purchases.unshift({
            email: buyerEmail.toLowerCase(),
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
            product: productSlug,
            amount: session.amount_total,
            purchasedAt: new Date().toISOString(),
            refunded: false,
          });
          savePurchases(purchases.slice(0, 5000));
        }

        // 1. If this purchase used a referral code, credit the original referrer $10.
        const full = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['total_details.breakdown.discounts.discount.promotion_code'],
        });
        const usedCode = full.total_details?.breakdown?.discounts?.[0]?.discount?.promotion_code?.code;
        if (usedCode) {
          const ownerEntry = Object.values(referrals.bySession).find(r => r.code === usedCode);
          if (ownerEntry?.ownerCustomerId) {
            await stripe.customers.createBalanceTransaction(ownerEntry.ownerCustomerId, {
              amount: -1000,
              currency: 'usd',
              description: `Referral reward — a friend used your code ${usedCode}`,
            });
            console.log(`Credited $10 to referrer ${ownerEntry.ownerCustomerId} for code ${usedCode}`);
          }
        }

        // 2. Generate THIS buyer's own referral code so they can refer others.
        const couponId = await getOrCreateReferralCoupon();
        const code = `FRIEND${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const promo = await stripe.promotionCodes.create({ coupon: couponId, code, max_redemptions: 50 });
        referrals.bySession[session.id] = {
          code: promo.code,
          ownerCustomerId: session.customer,
          ownerEmail: session.customer_details?.email || null,
        };
        referrals.processedSessions.push(session.id);
        saveReferrals(referrals);
      } catch (err) {
        console.error('Referral webhook processing error:', err.message);
      }
    }
  }

  res.json({ received: true });
});

// ── Inbound support email webhook (Resend) — raw body needed for svix signature verification ──
app.post('/api/inbound-email', express.text({ type: '*/*', limit: '2mb' }), async (req, res) => {
  if (!verifyResendSignature(req)) return res.status(401).send('Invalid signature');
  res.json({ received: true }); // ack immediately, process after

  try {
    const event = JSON.parse(req.body);
    const data = event.data || {};
    const fromEmail = (data.from?.address || data.from || '').toString();
    const subject = data.subject || '(no subject)';
    const bodyText = data.text || data.html?.replace(/<[^>]+>/g, ' ') || '';
    if (!fromEmail || !bodyText) return;

    let triage = { category: 'ESCALATE', reply: 'Thanks for reaching out — a member of our team will follow up within 24 hours.', internalNote: 'AI triage unavailable.' };
    if (anthropic) {
      try {
        const msg = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          messages: [{ role: 'user', content: `${SUPPORT_KB}\n\nInbound email — Subject: "${subject}"\nBody: ${bodyText.slice(0, 3000)}` }],
        });
        const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
        triage = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
      } catch (err) {
        console.error('Support triage error (defaulting to escalate):', err.message);
      }
    }

    await sendSupportEmail(fromEmail, `Re: ${subject}`, triage.reply);

    if (triage.category === 'ESCALATE') {
      const escalations = loadEscalations();
      escalations.unshift({
        id: `${Date.now()}`,
        receivedAt: new Date().toISOString(),
        from: fromEmail,
        subject,
        body: bodyText.slice(0, 3000),
        aiReplySent: triage.reply,
        internalNote: triage.internalNote,
      });
      saveEscalations(escalations.slice(0, 500));
      if (process.env.SUPPORT_NOTIFY_EMAIL) {
        await sendSupportEmail(
          process.env.SUPPORT_NOTIFY_EMAIL,
          `[ClaudeCraft Support] Needs your reply: ${subject}`,
          `From: ${fromEmail}\n\n${bodyText.slice(0, 1500)}\n\n— AI note: ${triage.internalNote}\n— AI already sent a holding reply to the customer.`
        );
      }
    }
  } catch (err) {
    console.error('Inbound email processing error:', err.message);
  }
});

app.use(express.json({ limit: '6mb' })); // article/share images are embedded as base64 — 200kb was too small and silently dropped them

app.get('/checkout/:product', async (req, res) => {
  const product = PRODUCTS[req.params.product];
  if (!product) return res.status(404).send('Unknown product');
  if (!stripe) return res.status(500).send('Checkout is not configured yet — STRIPE_SECRET_KEY is missing.');

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_creation: 'always',
      allow_promotion_codes: true,
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: product.amount,
          product_data: { name: product.name, description: product.description },
        },
        quantity: 1,
      }],
      metadata: { product: req.params.product },
      success_url: `${BASE_URL}/?purchased=true&product=${req.params.product}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/?canceled=true`,
    });
    res.redirect(303, session.url);
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).send('Something went wrong starting checkout. Please try again or email support@claudecraft.ca.');
  }
});

app.get('/api/recent-sales', async (req, res) => {
  if (!stripe) return res.json({ count: 0 });
  try {
    const since = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    const sessions = await stripe.checkout.sessions.list({ created: { gte: since }, limit: 100 });
    const count = sessions.data.filter(s => s.payment_status === 'paid').length;
    res.json({ count });
  } catch (err) {
    console.error('Recent sales fetch error (likely missing Checkout Sessions: Read permission on the restricted key):', err.message);
    res.json({ count: 0 });
  }
});

app.get('/api/referral-code', (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId) return res.status(400).json({ ready: false, error: 'session_id required' });
  const entry = loadReferrals().bySession[sessionId];
  res.json(entry ? { ready: true, code: entry.code } : { ready: false });
});

app.post('/api/subscribe', (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!isValidEmail) return res.status(400).json({ error: 'Please enter a valid email address.' });

  const subscribers = loadSubscribers();
  const isNew = !subscribers.some(s => s.email === email);
  if (isNew) {
    subscribers.push({ email, subscribedAt: new Date().toISOString() });
    saveSubscribers(subscribers);
  }
  if (isNew) {
    const ebookUrl = `${BASE_URL}/ebook.html`;
    sendSupportEmail(
      email,
      'Your free ebook: 25 Claude Prompts to Reclaim 10 Hours a Week',
      `Thanks for joining The AI Advantage newsletter!\n\nHere's your free ebook, as promised: ${ebookUrl}\n\nYour first newsletter issue lands this Friday. Questions any time — just reply to this email.`,
      `<p>Thanks for joining The AI Advantage newsletter!</p><p>Here's your free ebook, as promised: <a href="${ebookUrl}">25 Claude Prompts to Reclaim 10 Hours a Week</a></p><p>Your first newsletter issue lands this Friday. Questions any time — just reply to this email.</p>`
    ).catch(() => {}); // best-effort — don't block the signup response on email delivery
  }
  res.json({ ok: true });
});

// ── Self-serve instant refund ──────────────────────────────────────────────
// Rules-based, not AI-judgment-based: this only ever refunds a VERIFIED real
// Stripe payment, only within the 30-day guarantee window, and only ONCE per
// email ever — anything outside those three rules falls through to the
// existing human-escalation support flow instead of being auto-approved.
app.post('/api/self-refund', async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Refunds are not configured yet.' });
  const email = (req.body?.email || '').trim().toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!isValidEmail) return res.status(400).json({ error: 'Please enter a valid email address.' });

  const refundLog = loadRefundLog();
  if (refundLog.some(r => r.email === email)) {
    return res.json({
      ok: false,
      escalated: true,
      message: "You've already used a self-serve refund before. We've flagged this for a real person to review personally — email support@claudecraft.ca and reference this request.",
    });
  }

  const purchases = loadPurchases();
  const now = Date.now();
  const windowMs = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const eligible = purchases
    .filter(p => p.email === email && !p.refunded && (now - new Date(p.purchasedAt).getTime()) <= windowMs)
    .sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt))[0];

  if (!eligible) {
    return res.json({
      ok: false,
      escalated: false,
      message: "We couldn't find a purchase from this email within the last 30 days. If you think this is wrong, email support@claudecraft.ca and a real person will check manually.",
    });
  }

  try {
    await stripe.refunds.create({ payment_intent: eligible.paymentIntentId });

    eligible.refunded = true;
    savePurchases(purchases);

    refundLog.push({ email, sessionId: eligible.sessionId, product: eligible.product, refundedAt: new Date().toISOString() });
    saveRefundLog(refundLog);

    const productName = PRODUCTS[eligible.product]?.name || eligible.product;
    sendSupportEmail(
      email,
      `Your refund for ${productName} is on its way`,
      `Your refund for ${productName} has been processed — it should land back on your original payment method within 5-10 business days. No further action needed from you.`,
      `<p>Your refund for <strong>${productName}</strong> has been processed — it should land back on your original payment method within 5-10 business days. No further action needed from you.</p>`
    ).catch(() => {});

    res.json({ ok: true, message: `Refund for ${productName} processed — it'll land back on your original payment method within 5-10 business days.` });
  } catch (err) {
    console.error('Self-refund error:', err.message);
    res.status(500).json({ ok: false, escalated: false, message: "Something went wrong processing this automatically. Email support@claudecraft.ca and a real person will sort it out." });
  }
});

app.get('/api/subscribers', (req, res) => {
  const token = req.get('X-OpenClaw-Token');
  if (!process.env.ARTICLES_API_TOKEN || token !== process.env.ARTICLES_API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(loadSubscribers());
});

app.get('/api/support-escalations', (req, res) => {
  const token = req.get('X-OpenClaw-Token');
  if (!process.env.ARTICLES_API_TOKEN || token !== process.env.ARTICLES_API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(loadEscalations());
});

app.get('/api/articles', (req, res) => {
  res.json(loadArticles());
});

app.get('/api/articles/preview', (req, res) => {
  res.json(getAllArticles().slice(0, 6));
});

// Evergreen articles — full content lives here (not just the homepage excerpt) so /article/:id can render the whole piece.
const STATIC_ARTICLES = [
  {
    id: 'claude-skills-explainer',
    tag: 'Feature Explainer',
    title: 'What Are Claude "Skills," Really? (And Why It Matters For You)',
    meta: '6 min read',
    date: '2026-06-01',
    bodyHtml: `
      <p>Anthropic shipped a real, native "Agent Skills" feature for Claude — and it's genuinely different from just pasting instructions into a Custom Instructions box. A native Skill is a small folder containing a <strong>SKILL.md</strong> file plus optional scripts and resources, uploaded as a zip. Claude scans the metadata of every installed Skill and only pulls in the full content when it's actually relevant to what you're doing — a technique called progressive disclosure.</p>
      <p>Good news as of the latest update: native Skills now work on every plan, including <strong>Free</strong> — not just paid tiers like before. The catch is they still require <strong>Code Execution</strong> turned on (Settings → Capabilities → "Code execution and file creation"), and building your own custom Skill still means packaging a zip file — genuinely not something most non-technical users want to deal with on day one, even though Anthropic's docs now note "no coding required for simple skills."</p>
      <p>That's exactly why every ClaudeCraft bundle still ships in the simple copy-paste Custom Instructions format: zero setup beyond pasting text, works the moment you turn it on, no zip files, no toggles to hunt for. But we're watching the native Skills format closely — it's the more "official" long-term direction, and our roadmap includes a Skills-format upgrade path. If you're curious how to package your own Custom Instructions as a real Skill someday, that's a great sign you're ready to graduate from beginner tools — which is also exactly what our <strong>Claude Co-Work Beginner's Guide</strong> is designed to get you to.</p>
      <p>Anthropic has also started shipping its own pre-built Skills directly — ready-made ones for Excel, Word, PowerPoint, and PDF workflows, alongside partner-built Skills from companies like Notion, Figma, and Atlassian that are designed to work hand-in-hand with Connectors (more on those in our Claude Connected Pack). For Team and Enterprise plans, an organization owner can even push a standardized set of Skills out to every member at once — meaning the gap between "person who knows a clever Claude trick" and "company that's standardized on AI workflows" is closing fast.</p>
      <p>So what should you actually do with this, today? If you're new, ignore native Skills entirely for now — every skill in our bundles works identically well without them, and you'll get to real results faster. If you're already comfortable with Claude and curious about the more technical format, our <strong>Power User Pack</strong> includes a skill that walks you through packaging your first real Claude Skill, start to finish, including the Code Execution toggle most people never knew existed.</p>`,
  },
  {
    id: 'five-prompting-habits',
    tag: 'Tech Tip',
    title: '5 Prompting Habits That Instantly Improve Your Results',
    meta: '4 min read',
    date: '2026-06-02',
    bodyHtml: `
      <p><strong>1. Give Role, Task, Context, and Format — every time.</strong> Most disappointing AI responses come from under-explaining, not from the AI being "bad." Tell it who it should act as, exactly what you want, the specific details that make it YOUR situation, and how you want it formatted.</p>
      <p><strong>2. Paste a real example of your own voice.</strong> One paragraph of your own past writing, with "match this style," does more for output quality than almost any other single trick.</p>
      <p><strong>3. Iterate instead of restarting.</strong> If a response isn't quite right, say what's off — "shorter," "less formal," "add urgency." Claude keeps the conversation's context, so corrections compound instead of starting from zero.</p>
      <p><strong>4. Ask it to ask YOU questions first</strong> for anything complex or high-stakes. "Ask me 3 clarifying questions before you answer" consistently produces better results on nuanced requests.</p>
      <p><strong>5. Separate jobs into separate Projects.</strong> A Project that does five different things does all five worse than five focused Projects would. Specialization beats generalization, every time.</p>`,
  },
  {
    id: 'save-tokens-money',
    tag: 'Tech Tip',
    title: 'How to Save Tokens (and Money) When Using Claude',
    meta: '5 min read',
    date: '2026-06-03',
    bodyHtml: `
      <p>"Tokens" are roughly chunks of text — and on paid API plans or usage-limited tiers, they're what you're actually spending. Here's how to get more out of fewer of them:</p>
      <p><strong>Trim your own input.</strong> Pasting an entire 40-page document when you only need page 12 burns tokens on content Claude never needed. Paste only the relevant section when you can.</p>
      <p><strong>Ask for the format you actually need, not the most thorough one.</strong> "Summarize in 3 bullet points" costs a fraction of "explain in detail" — and is often more useful anyway.</p>
      <p><strong>Don't re-paste context that's already in the conversation.</strong> Within one chat, Claude already has everything said so far — re-explaining it wastes tokens on both sides.</p>
      <p><strong>Use Projects instead of re-explaining setup every time.</strong> Custom Instructions are loaded efficiently per-project — far cheaper over time than retyping the same setup paragraph into a fresh chat repeatedly.</p>
      <p><strong>Close out chats that have drifted long and unfocused.</strong> Extremely long conversations carry their full history forward with every new message. If a chat has wandered far from its original purpose, starting fresh is often both cheaper and gets you a cleaner answer.</p>`,
  },
  {
    id: 'claude-vs-chatgpt-vs-gemini',
    tag: 'Comparison',
    title: 'Claude vs ChatGPT vs Gemini: What Actually Matters for Everyday Use',
    meta: '5 min read',
    date: '2026-06-04',
    bodyHtml: `
      <p>Benchmark wars make headlines, but for everyday work, the practical differences come down to a few things that actually affect your day:</p>
      <p><strong>Writing quality and tone control.</strong> Claude is widely regarded as strong at producing natural, non-robotic prose and reliably following nuanced tone instructions — useful for anything client-facing.</p>
      <p><strong>Long document handling.</strong> Claude's large context window makes it comfortable working with long documents, contracts, or codebases in a single conversation without losing track of earlier details.</p>
      <p><strong>Projects vs. Custom GPTs vs. Gems.</strong> All three major assistants now offer some version of "persistent specialist space" — Claude's Projects, ChatGPT's Custom GPTs, Gemini's Gems. The core idea (set it up once, reuse forever) is the same; pick based on which ecosystem you're already in for other tools.</p>
      <p><strong>The honest answer:</strong> for most non-technical, everyday use — writing, planning, learning, document work — all three are genuinely capable now. The bigger factor is usually which one you actually build a habit around, which is exactly what our Co-Work Beginner's Guide and skill bundles are designed to help with.</p>`,
  },
  {
    id: 'brand-voice-trainer-trick',
    tag: 'Product Tip',
    title: 'The "Brand Voice Trainer" Trick That Changes Everything',
    meta: '3 min read',
    date: '2026-06-05',
    bodyHtml: `
      <p>If you create any kind of content regularly, here's the single highest-leverage thing you can do before anything else: teach Claude your actual voice, once, in its own dedicated Project.</p>
      <p>Ask it to interview you — tone, a creator whose voice you admire, words you love, words you hate, and one example of your own writing that feels exactly right. Have it summarize that back as a short "voice profile."</p>
      <p>From then on, paste that voice profile at the start of any writing request, anywhere — blog posts, emails, social captions, even cover letters. The difference between generic-AI-sounding output and content that genuinely sounds like you almost always comes down to this one step, which most people skip entirely. (This exact skill — fully built — is Skill #10 in our Content Machine Pack.)</p>`,
  },
  {
    id: 'claude-projects-101',
    tag: 'Feature Explainer',
    title: 'Claude Projects 101: The Feature Most People Never Turn On',
    meta: '4 min read',
    date: '2026-06-06',
    bodyHtml: `
      <p>The single biggest gap between someone who's "tried Claude a few times" and someone who "works with Claude every day" is almost always one feature: Projects.</p>
      <p>Without it, every new chat starts from zero — you re-explain context, re-paste instructions, and the whole thing feels like a novelty instead of a tool. With it, you set up a dedicated specialist once — Custom Instructions describing exactly what the job is — and every future chat inside that Project already knows the rules.</p>
      <p>Most regular users settle into somewhere between 3 and 10 active Projects covering their most repeated tasks: client emails, content drafts, weekly planning, whatever shows up over and over in their actual work. If you've never set one up, it's a five-minute investment that changes how the entire tool feels. Our <strong>Claude Co-Work Beginner's Guide</strong> walks the exact clicks, step by step, in Part 3.</p>`,
  },
];

function getAllArticles() {
  const dynamic = loadArticles().map(a => ({ ...a, isDynamic: true }));
  return [...dynamic, ...STATIC_ARTICLES];
}

function articlePageShell(title, bodyContent) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — ClaudeCraft</title>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
:root{--brand:#FF6B1A;--brand-light:#FF8C42;--bg:#070A12;--glass:rgba(255,255,255,0.04);--glass-border:rgba(255,255,255,0.07);--text:#EDF0F7;--sub:#8B93A8;--muted:#4A5268;}
body{font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;background:var(--bg);color:var(--text);line-height:1.7;-webkit-font-smoothing:antialiased;}
.wrap{max-width:680px;margin:0 auto;padding:56px 24px 100px;}
.back-link{display:inline-flex;align-items:center;gap:6px;color:var(--sub);text-decoration:none;font-size:0.88rem;font-weight:600;margin-bottom:36px;}
.back-link:hover{color:var(--brand-light);}
.tag{font-size:0.7rem;font-weight:800;color:var(--brand);text-transform:uppercase;letter-spacing:1.5px;}
h1{font-size:clamp(1.8rem,4vw,2.6rem);font-weight:900;letter-spacing:-1px;margin:14px 0 10px;line-height:1.2;}
.meta{font-size:0.82rem;color:var(--muted);margin-bottom:36px;}
.article-content p{margin-bottom:20px;font-size:1.02rem;color:var(--sub);}
.article-content strong{color:var(--text);}
.cta{margin-top:48px;padding:28px;background:var(--glass);border:1px solid var(--glass-border);border-radius:16px;text-align:center;}
.cta a{display:inline-block;margin-top:12px;background:linear-gradient(135deg,var(--brand-light),var(--brand));color:#fff;font-weight:700;padding:12px 26px;border-radius:8px;text-decoration:none;font-size:0.9rem;}
</style></head><body><div class="wrap">${bodyContent}</div></body></html>`;
}

app.get('/article/:id', (req, res) => {
  const article = getAllArticles().find(a => a.id === req.params.id);
  if (!article) return res.status(404).send(articlePageShell('Not Found', '<a class="back-link" href="/articles.html">← Back to Articles</a><h1>Article not found</h1>'));
  const body = `
    <a class="back-link" href="/articles.html">← Back to Articles</a>
    <span class="tag">${article.tag}</span>
    <h1>${article.title}</h1>
    <div class="meta">${article.date} · ${article.meta}</div>
    <div class="article-content">${article.bodyHtml}${article.sourcesHtml ? `<p style="font-size:0.8rem;">${article.sourcesHtml}</p>` : ''}</div>
    <div class="cta">Want done-for-you Claude skills, not just tips?<br><a href="/#products">Browse Bundles →</a></div>`;
  res.send(articlePageShell(article.title, body));
});

app.get('/articles.html', (req, res) => {
  const cards = getAllArticles().map(a => `
    <a class="list-card" href="/article/${a.id}">
      <span class="tag">${a.tag}</span>
      <h3>${a.title}</h3>
      <div class="meta">${a.date} · ${a.meta}</div>
    </a>`).join('');
  const body = `
    <a class="back-link" href="/#articles">← Back to ClaudeCraft</a>
    <h1>All Articles</h1>
    <div class="list-grid">${cards}</div>
    <style>
      .list-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-top:24px;}
      .list-card{display:block;background:var(--glass);border:1px solid var(--glass-border);border-radius:16px;padding:22px;text-decoration:none;color:inherit;transition:border-color .2s,transform .2s;}
      .list-card:hover{border-color:rgba(255,107,26,0.35);transform:translateY(-2px);}
      .list-card h3{font-size:1rem;font-weight:800;color:var(--text);margin:10px 0 8px;line-height:1.4;}
    </style>`;
  res.send(articlePageShell('All Articles', body));
});

app.post('/api/articles', (req, res) => {
  const token = req.get('X-OpenClaw-Token');
  if (!process.env.ARTICLES_API_TOKEN || token !== process.env.ARTICLES_API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { tag, title, meta, bodyHtml, sourcesHtml } = req.body || {};
  if (!title || !bodyHtml) return res.status(400).json({ error: 'title and bodyHtml are required' });

  const articles = loadArticles();
  articles.unshift({
    id: `${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    tag: tag || 'AI News',
    title,
    meta: meta || 'New today',
    bodyHtml,
    sourcesHtml: sourcesHtml || '',
  });
  saveArticles(articles.slice(0, MAX_DYNAMIC_ARTICLES));
  res.json({ ok: true, count: articles.length });
});

app.post('/api/og-image', (req, res) => {
  const token = req.get('X-OpenClaw-Token');
  if (!process.env.ARTICLES_API_TOKEN || token !== process.env.ARTICLES_API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { imageBase64 } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(OG_IMAGE_PATH, Buffer.from(imageBase64, 'base64'));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/og-image.png', (req, res) => {
  if (!fs.existsSync(OG_IMAGE_PATH)) return res.status(404).send('Not generated yet');
  res.sendFile(OG_IMAGE_PATH);
});

app.use('/marketing', (req, res) => res.status(404).send('Not found'));

app.use(express.static(__dirname, { extensions: ['html'] }));

app.get('/healthz', (req, res) => res.status(200).send('ok'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`ClaudeCraft static site listening on port ${port}`);
  console.log(`Stripe checkout: ${stripe ? 'configured' : 'NOT configured (missing STRIPE_SECRET_KEY)'}`);
  console.log(`Referral webhook: ${process.env.STRIPE_WEBHOOK_SECRET ? 'configured' : 'NOT configured (missing STRIPE_WEBHOOK_SECRET)'}`);
  console.log(`Support email AI: ${anthropic && process.env.RESEND_API_KEY && process.env.RESEND_WEBHOOK_SECRET ? 'configured' : 'NOT fully configured (needs ANTHROPIC_API_KEY, RESEND_API_KEY, RESEND_WEBHOOK_SECRET)'}`);
});
