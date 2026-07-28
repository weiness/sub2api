DROP INDEX IF EXISTS users_phone_unique;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_active
    ON users (phone)
    WHERE deleted_at IS NULL AND phone IS NOT NULL AND phone <> '';
