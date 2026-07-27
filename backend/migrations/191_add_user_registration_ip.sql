ALTER TABLE users
    ADD COLUMN IF NOT EXISTS registration_ip VARCHAR(45) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_users_registration_ip_created_at
    ON users (registration_ip, created_at);
