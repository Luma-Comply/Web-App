-- Add subscription and billing fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
ADD COLUMN IF NOT EXISTS cases_remaining INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS cases_used_this_period INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS seats_count INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS billing_period_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month'),
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Update trigger to reset cases counter monthly
CREATE OR REPLACE FUNCTION reset_monthly_cases()
RETURNS TRIGGER AS $$
BEGIN
  -- If billing period has ended, reset cases
  IF NEW.billing_period_end < NOW() THEN
    NEW.cases_used_this_period := 0;
    NEW.cases_remaining := 50;
    NEW.billing_period_start := NOW();
    NEW.billing_period_end := NOW() + INTERVAL '1 month';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_monthly_cases
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION reset_monthly_cases();

COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN users.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN users.subscription_status IS 'active, trialing, canceled, past_due, paused';
COMMENT ON COLUMN users.subscription_tier IS 'professional (only tier for now)';
COMMENT ON COLUMN users.trial_ends_at IS '14 days from signup';
COMMENT ON COLUMN users.cases_remaining IS 'Cases left in current billing period (50 included)';
COMMENT ON COLUMN users.cases_used_this_period IS 'Cases used this billing period';
COMMENT ON COLUMN users.seats_count IS 'Number of seats (3 included, +$15/mo per extra)';
