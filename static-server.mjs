import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 8080;

const DATA_DIR = process.env.ARTICLES_DATA_DIR || '/data';
const ARTICLES_PATH = path.join(DATA_DIR, 'articles.json');
const REFERRALS_PATH = path.join(DATA_DIR, 'referrals.json');
const REFERRAL_COUPON_ID_PATH = path.join(DATA_DIR, 'referral-coupon-id.txt');
const SUBSCRIBERS_PATH = path.join(DATA_DIR, 'subscribers.json');
const MAX_DYNAMIC_ARTICLES = 90; // a few months of daily content before the oldest roll off

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://claudecraft-production.up.railway.app';

const PRODUCTS = {
  solo: { name: 'Solo Entrepreneur Pack', amount: 4900, description: '15 done-for-you Claude skills + bonus, for running a solo business.' },
  content: { name: 'Content Machine Pack', amount: 3900, description: '12 done-for-you Claude skills + bonus, for content creators.' },
  starter: { name: '55+ AI Starter Kit', amount: 2900, description: '10 done-for-you Claude skills for everyday life, senior-friendly.' },
  cowork: { name: "Claude Co-Work Beginner's Guide", amount: 1900, description: 'A complete 8-part, step-by-step guide to working with Claude every day.' },
  student: { name: 'Student Success Pack', amount: 3400, description: '12 done-for-you Claude skills + bonus, for academic life.' },
  jobseeker: { name: "Job Seeker's Career Pack", amount: 3400, description: '12 done-for-you Claude skills + bonus, for resumes, interviews, and the job search.' },
  poweruser: { name: 'Claude Power User Pack', amount: 2900, description: '8 advanced skills: real Claude Skills format, token efficiency, agentic workflows, and more.' },
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

app.use(express.json({ limit: '200kb' }));

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
      success_url: `${BASE_URL}/?purchased=true&product=${req.params.product}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/?canceled=true`,
    });
    res.redirect(303, session.url);
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).send('Something went wrong starting checkout. Please try again or email support@claudecraft.io.');
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
  if (!subscribers.some(s => s.email === email)) {
    subscribers.push({ email, subscribedAt: new Date().toISOString() });
    saveSubscribers(subscribers);
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
});
