-- Marks subscription plans that should receive the promotional recommendation badge.
ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS recommended BOOLEAN NOT NULL DEFAULT FALSE;
