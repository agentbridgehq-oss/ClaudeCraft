/**
 * ClaudeCraft Onboarding Database Migration
 */

export const claudecraftOnboardingMigration = `
CREATE TABLE IF NOT EXISTS claudecraft_onboarding (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  product_slug VARCHAR(50) NOT NULL,
  stage VARCHAR(50) DEFAULT 'purchased', -- purchased, email_sent, setup_started, first_use, success, churned
  purchased_at TIMESTAMP NOT NULL,
  setup_started_at TIMESTAMP,
  first_use_at TIMESTAMP,
  success_at TIMESTAMP,
  ai_follow_ups INT DEFAULT 0,
  last_follow_up_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_email (email),
  INDEX idx_stage (stage),
  INDEX idx_purchased_at (purchased_at)
);

-- Track onboarding success metrics over time
CREATE TABLE IF NOT EXISTS claudecraft_onboarding_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_customers INT,
  successful_onboardings INT,
  churned INT,
  avg_follow_ups DECIMAL(5, 2),
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Index for daily metrics aggregation
CREATE INDEX IF NOT EXISTS idx_onboarding_metrics_date ON claudecraft_onboarding_metrics(date);
`;
