ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS base_sold_count INTEGER NOT NULL DEFAULT 0;
