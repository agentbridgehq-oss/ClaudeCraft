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
const OG_IMAGE_PATH = path.join(DATA_DIR, 'og-image.png');
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
