-- ============================================================
-- Anga Security - Database Schema
-- Run in Supabase SQL Editor (same instance as angaflow.mx)
-- ============================================================

-- 1. security_accounts
-- One per user, stores credit balance and plan info
CREATE TABLE IF NOT EXISTS security_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'standard', 'pro', 'enterprise')),
  credit_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  free_scans_used INTEGER NOT NULL DEFAULT 0,
  free_scans_lifetime INTEGER NOT NULL DEFAULT 0,
  first_reload_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. security_credit_transactions
-- Tracks all credit movements (purchases, deductions, bonuses, refunds)
CREATE TABLE IF NOT EXISTS security_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES security_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('recharge', 'deduction', 'bonus', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  bonus DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_credits DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2),
  balance_after DECIMAL(10,2),
  description TEXT,
  payment_id TEXT,
  report_id UUID,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 3. security_payment_logs
-- Audit trail for all MercadoPago payments (idempotency check)
CREATE TABLE IF NOT EXISTS security_payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT NOT NULL,
  status TEXT NOT NULL,
  status_detail TEXT,
  amount DECIMAL(10,2),
  currency TEXT NOT NULL DEFAULT 'MXN',
  payer_email TEXT,
  external_reference TEXT,
  payment_type TEXT CHECK (payment_type IN ('credit_recharge', 'subscription', 'consulting')),
  metadata JSONB,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. security_subscriptions
-- Watch/Guard/Shield monitoring subscriptions
CREATE TABLE IF NOT EXISTS security_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES security_accounts(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('watch', 'guard', 'shield')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  payment_id TEXT,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. security_reports (stub for Phase 3)
-- Stores completed security audit reports and attack simulations
CREATE TABLE IF NOT EXISTS security_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES security_accounts(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('quick_scan', 'audit', 'simulation', 'assessment')),
  score INTEGER CHECK (score >= 0 AND score <= 100),
  grade TEXT CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  credits_charged DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_security_accounts_user_id ON security_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_accounts_email ON security_accounts(email);
CREATE INDEX IF NOT EXISTS idx_security_credit_transactions_account_id ON security_credit_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_security_credit_transactions_payment_id ON security_credit_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_security_payment_logs_payment_id ON security_payment_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_security_payment_logs_external_reference ON security_payment_logs(external_reference);
CREATE INDEX IF NOT EXISTS idx_security_subscriptions_account_id ON security_subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_security_reports_account_id ON security_reports(account_id);
CREATE INDEX IF NOT EXISTS idx_security_reports_domain ON security_reports(domain);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_security_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_security_accounts_updated_at
  BEFORE UPDATE ON security_accounts
  FOR EACH ROW EXECUTE FUNCTION update_security_updated_at();

CREATE TRIGGER trg_security_subscriptions_updated_at
  BEFORE UPDATE ON security_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_security_updated_at();

-- ============================================================
-- PL/pgSQL FUNCTIONS
-- ============================================================

-- Add credits to a security account (with optional first-reload bonus)
CREATE OR REPLACE FUNCTION add_security_credits(
  p_account_id UUID,
  p_amount DECIMAL,
  p_payment_id TEXT,
  p_description TEXT DEFAULT 'Credit recharge'
)
RETURNS TABLE(new_balance DECIMAL, bonus_amount DECIMAL, total_added DECIMAL) AS $$
DECLARE
  v_account security_accounts%ROWTYPE;
  v_bonus DECIMAL := 0;
  v_total DECIMAL;
  v_balance_before DECIMAL;
BEGIN
  -- Lock the account row to prevent race conditions
  SELECT * INTO v_account
  FROM security_accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found: %', p_account_id;
  END IF;

  v_balance_before := v_account.credit_balance;

  -- Calculate first-reload bonus (+20%)
  IF NOT v_account.first_reload_bonus_claimed THEN
    v_bonus := ROUND(p_amount * 0.20, 2);
    UPDATE security_accounts
    SET first_reload_bonus_claimed = TRUE
    WHERE id = p_account_id;
  END IF;

  v_total := p_amount + v_bonus;

  -- Update balance
  UPDATE security_accounts
  SET credit_balance = credit_balance + v_total
  WHERE id = p_account_id;

  -- Log the recharge transaction
  INSERT INTO security_credit_transactions (
    account_id, type, amount, bonus, total_credits,
    balance_before, balance_after, description, payment_id, status
  ) VALUES (
    p_account_id, 'recharge', p_amount, v_bonus, v_total,
    v_balance_before, v_balance_before + v_total, p_description, p_payment_id, 'completed'
  );

  -- Log bonus separately if applicable
  IF v_bonus > 0 THEN
    INSERT INTO security_credit_transactions (
      account_id, type, amount, bonus, total_credits,
      balance_before, balance_after, description, payment_id, status
    ) VALUES (
      p_account_id, 'bonus', v_bonus, 0, v_bonus,
      v_balance_before + p_amount, v_balance_before + v_total,
      'First reload bonus (+20%)', p_payment_id, 'completed'
    );
  END IF;

  RETURN QUERY SELECT
    v_balance_before + v_total AS new_balance,
    v_bonus AS bonus_amount,
    v_total AS total_added;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deduct credits from a security account (atomic, with row locking)
CREATE OR REPLACE FUNCTION deduct_security_credits(
  p_account_id UUID,
  p_amount DECIMAL,
  p_description TEXT,
  p_report_id UUID DEFAULT NULL
)
RETURNS TABLE(new_balance DECIMAL, success BOOLEAN) AS $$
DECLARE
  v_account security_accounts%ROWTYPE;
  v_balance_before DECIMAL;
BEGIN
  -- Lock the account row
  SELECT * INTO v_account
  FROM security_accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found: %', p_account_id;
  END IF;

  v_balance_before := v_account.credit_balance;

  -- Check sufficient balance
  IF v_balance_before < p_amount THEN
    RETURN QUERY SELECT v_balance_before AS new_balance, FALSE AS success;
    RETURN;
  END IF;

  -- Deduct
  UPDATE security_accounts
  SET credit_balance = credit_balance - p_amount
  WHERE id = p_account_id;

  -- Log the deduction
  INSERT INTO security_credit_transactions (
    account_id, type, amount, bonus, total_credits,
    balance_before, balance_after, description, report_id, status
  ) VALUES (
    p_account_id, 'deduction', p_amount, 0, p_amount,
    v_balance_before, v_balance_before - p_amount, p_description, p_report_id, 'completed'
  );

  RETURN QUERY SELECT
    v_balance_before - p_amount AS new_balance,
    TRUE AS success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE security_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_reports ENABLE ROW LEVEL SECURITY;

-- security_accounts: Users can read/update their own row
CREATE POLICY "Users can view own security account"
  ON security_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own security account"
  ON security_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on security_accounts"
  ON security_accounts FOR ALL
  USING (auth.role() = 'service_role');

-- security_credit_transactions: Users can view their own
CREATE POLICY "Users can view own credit transactions"
  ON security_credit_transactions FOR SELECT
  USING (account_id IN (SELECT id FROM security_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access on security_credit_transactions"
  ON security_credit_transactions FOR ALL
  USING (auth.role() = 'service_role');

-- security_payment_logs: Service role only
CREATE POLICY "Service role full access on security_payment_logs"
  ON security_payment_logs FOR ALL
  USING (auth.role() = 'service_role');

-- security_subscriptions: Users can view their own
CREATE POLICY "Users can view own subscriptions"
  ON security_subscriptions FOR SELECT
  USING (account_id IN (SELECT id FROM security_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access on security_subscriptions"
  ON security_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- security_reports: Users can view their own
CREATE POLICY "Users can view own reports"
  ON security_reports FOR SELECT
  USING (account_id IN (SELECT id FROM security_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access on security_reports"
  ON security_reports FOR ALL
  USING (auth.role() = 'service_role');
