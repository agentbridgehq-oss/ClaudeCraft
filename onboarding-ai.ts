/**
 * ClaudeCraft Autonomous Onboarding AI
 * Runs alongside AgentBridge - autonomously onboards customers
 * Tracks purchase → setup → first use → success
 */

import { Pool } from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import nodemailer from 'nodemailer';

interface OnboardingRecord {
  userId: string;
  email: string;
  productPurchased: string;
  purchasedAt: Date;
  stage: 'purchased' | 'email_sent' | 'setup_started' | 'first_use' | 'success' | 'churned';
  setupStartedAt?: Date;
  firstUseAt?: Date;
  successAt?: Date;
  aiFollowUps: number;
  lastFollowUpAt?: Date;
}

export class ClaudeCraftOnboarding {
  private pool: Pool;
  private anthropic: Anthropic;
  private emailer: nodemailer.Transporter;

  constructor(pool: Pool) {
    this.pool = pool;
    this.anthropic = new Anthropic();
    this.emailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Post-purchase: Send personalized onboarding email with setup guide
   */
  async onboardNewCustomer(
    email: string,
    productSlug: string,
    productName: string,
    downloadUrls: string[]
  ): Promise<void> {
    try {
      const onboardingEmail = await this.generateOnboardingEmail(productName, productSlug);

      await this.emailer.sendMail({
        from: process.env.SUPPORT_EMAIL,
        to: email,
        subject: `Welcome to ClaudeCraft! 🎉 Your ${productName} Setup Guide`,
        html: onboardingEmail,
      });

      // Record onboarding start
      await this.recordOnboarding(email, productSlug, 'email_sent');

      // Schedule day-2 follow-up
      this.scheduleFollowUp(email, productSlug, 2);
    } catch (error) {
      console.error('[ClaudeCraft Onboarding] Error:', error);
    }
  }

  /**
   * Generate personalized onboarding email using AI
   */
  private async generateOnboardingEmail(
    productName: string,
    productSlug: string
  ): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `Write a warm, 3-paragraph onboarding email for a customer who just bought "${productName}" from ClaudeCraft. 
          
          Make it personal, enthusiastic, and action-oriented. Include:
          1. Warm greeting celebrating their purchase
          2. One-sentence summary of what they now have
          3. Next step: "Complete setup in 5 minutes" with what to expect
          
          Sign off as "The ClaudeCraft Team" with a "questions? reply to this email" CTA.
          
          Return ONLY valid HTML (no markdown), no opening/closing <html> tags.`,
        },
      ],
    });

    return (response.content[0] as any).text.trim();
  }

  /**
   * Day-2 follow-up: "How's setup going?"
   */
  async sendDay2FollowUp(email: string, productSlug: string): Promise<void> {
    const record = await this.getOnboardingRecord(email);

    if (!record || record.stage === 'success' || record.stage === 'churned') {
      return;
    }

    if (record.stage === 'email_sent') {
      const html = `
        <h2>Quick check-in: How's setup going? 🚀</h2>
        <p>We sent you the ${productSlug} bundle files yesterday. Just checking in:</p>
        <ul>
          <li>Did you download the files?</li>
          <li>Any setup questions?</li>
          <li>Want a quick walkthrough call?</li>
        </ul>
        <p><strong>Most customers get fully set up in 5-10 minutes.</strong> If you're stuck, just reply to this email and we'll help.</p>
        <p>— The ClaudeCraft Team</p>
      `;

      await this.emailer.sendMail({
        from: process.env.SUPPORT_EMAIL,
        to: email,
        subject: `[Quick Check] Setup going OK with your ClaudeCraft bundle?`,
        html,
      });

      await this.pool.query(
        `UPDATE onboarding_records SET ai_follow_ups = ai_follow_ups + 1, last_follow_up_at = NOW() WHERE email = $1`,
        [email]
      );
    }
  }

  /**
   * Day-7 check: "Are you using it?"
   */
  async sendDay7CheckIn(email: string, productSlug: string): Promise<void> {
    const record = await this.getOnboardingRecord(email);

    if (!record || record.stage === 'success' || record.stage === 'churned') {
      return;
    }

    const daysAgo = Math.floor(
      (Date.now() - new Date(record.purchasedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysAgo >= 7 && record.stage !== 'first_use') {
      const html = `
        <h2>How many hours have you saved this week? ⏰</h2>
        <p>It's been a week since you got your ClaudeCraft bundle. We'd love to know:</p>
        <ul>
          <li>Have you tried your first skill yet?</li>
          <li>What's the time-saving you're seeing?</li>
          <li>Anything not working as expected?</li>
        </ul>
        <p>If you haven't started yet, no judgment — but you're sitting on saved time. Reply and let's get you unstuck.</p>
        <p>Remember: you have a 30-day money-back guarantee if this isn't working for you.</p>
        <p>— The ClaudeCraft Team</p>
      `;

      await this.emailer.sendMail({
        from: process.env.SUPPORT_EMAIL,
        to: email,
        subject: `One week in — your ClaudeCraft bundle success check`,
        html,
      });

      await this.pool.query(
        `UPDATE onboarding_records SET ai_follow_ups = ai_follow_ups + 1, last_follow_up_at = NOW() WHERE email = $1`,
        [email]
      );
    }
  }

  /**
   * Day-14 intervention: "Still interested?"
   */
  async sendDay14Intervention(email: string, productSlug: string): Promise<void> {
    const record = await this.getOnboardingRecord(email);

    if (!record || record.stage === 'success' || record.stage === 'churned') {
      return;
    }

    const daysAgo = Math.floor(
      (Date.now() - new Date(record.purchasedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysAgo >= 14 && record.stage === 'email_sent') {
      const html = `
        <h2>Let's make sure this is working for you 💙</h2>
        <p>Two weeks in and we haven't heard from you. That's totally OK — but we want to help.</p>
        <p>Common reasons people get stuck:</p>
        <ul>
          <li><strong>Didn't know where to start</strong> — we can point you to the best first skill</li>
          <li><strong>Not sure it's actually saving time</strong> — let's do a 15-min demo call</li>
          <li><strong>Changed your mind</strong> — no problem, 30-day refund is super easy</li>
        </ul>
        <p>Just reply to this email with what's happening, and we'll sort it.</p>
        <p>— The ClaudeCraft Team</p>
      `;

      await this.emailer.sendMail({
        from: process.env.SUPPORT_EMAIL,
        to: email,
        subject: `2 weeks in — ClaudeCraft check-in (or we can refund)`,
        html,
      });

      await this.pool.query(
        `UPDATE onboarding_records SET stage = 'churned', ai_follow_ups = ai_follow_ups + 1 WHERE email = $1`,
        [email]
      );
    }
  }

  /**
   * Day-28 retention: "Last chance for refund (or you're keeping it!)"
   */
  async sendDay28Final(email: string, productSlug: string): Promise<void> {
    const record = await this.getOnboardingRecord(email);

    if (!record || record.stage === 'success') {
      return;
    }

    const daysAgo = Math.floor(
      (Date.now() - new Date(record.purchasedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysAgo >= 28) {
      const html = `
        <h2>Your 30-day window closes tomorrow ⏰</h2>
        <p>Just a heads up: your money-back guarantee expires in 24 hours.</p>
        <p>If you want a refund, just visit <a href="https://claudecraft.ca/refund.html">claudecraft.ca/refund.html</a> — instant, no questions.</p>
        <p>If you're keeping it, we're so glad you found this useful. You've got free updates forever.</p>
        <p>— The ClaudeCraft Team</p>
      `;

      await this.emailer.sendMail({
        from: process.env.SUPPORT_EMAIL,
        to: email,
        subject: `Last chance: Your ClaudeCraft refund window closes tomorrow`,
        html,
      });
    }
  }

  /**
   * Record onboarding milestone
   */
  private async recordOnboarding(
    email: string,
    productSlug: string,
    stage: string
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO claudecraft_onboarding (email, product_slug, stage, purchased_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (email) DO UPDATE SET
       stage = $3, updated_at = NOW()`,
      [email, productSlug, stage]
    );
  }

  /**
   * Get onboarding record for a customer
   */
  private async getOnboardingRecord(email: string): Promise<OnboardingRecord | null> {
    const result = await this.pool.query(
      `SELECT * FROM claudecraft_onboarding WHERE email = $1`,
      [email]
    );

    if (!result.rows[0]) {
      return null;
    }

    const row = result.rows[0];
    return {
      userId: row.user_id,
      email: row.email,
      productPurchased: row.product_slug,
      purchasedAt: new Date(row.purchased_at),
      stage: row.stage,
      setupStartedAt: row.setup_started_at ? new Date(row.setup_started_at) : undefined,
      firstUseAt: row.first_use_at ? new Date(row.first_use_at) : undefined,
      successAt: row.success_at ? new Date(row.success_at) : undefined,
      aiFollowUps: row.ai_follow_ups,
      lastFollowUpAt: row.last_follow_up_at ? new Date(row.last_follow_up_at) : undefined,
    };
  }

  /**
   * Schedule follow-up email (day N)
   */
  private scheduleFollowUp(email: string, productSlug: string, dayNumber: number): void {
    const delayMs = dayNumber * 24 * 60 * 60 * 1000;
    setTimeout(() => {
      if (dayNumber === 2) {
        this.sendDay2FollowUp(email, productSlug);
      } else if (dayNumber === 7) {
        this.sendDay7CheckIn(email, productSlug);
      } else if (dayNumber === 14) {
        this.sendDay14Intervention(email, productSlug);
      } else if (dayNumber === 28) {
        this.sendDay28Final(email, productSlug);
      }
    }, delayMs);
  }

  /**
   * Get onboarding metrics
   */
  async getOnboardingMetrics(): Promise<any> {
    const result = await this.pool.query(`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN stage = 'success' THEN 1 END) as successful_onboardings,
        COUNT(CASE WHEN stage = 'churned' THEN 1 END) as churned,
        COUNT(CASE WHEN ai_follow_ups > 0 THEN 1 END) as engaged_with_followups,
        AVG(ai_follow_ups) as avg_follow_ups_per_customer
      FROM claudecraft_onboarding
      WHERE purchased_at > NOW() - INTERVAL '90 days'
    `);

    return result.rows[0];
  }
}

export const initializeOnboarding = (pool: Pool): ClaudeCraftOnboarding => {
  return new ClaudeCraftOnboarding(pool);
};
