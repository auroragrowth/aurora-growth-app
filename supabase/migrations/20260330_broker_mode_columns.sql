-- Add mode and base_url columns to trading212_connections
ALTER TABLE trading212_connections
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS base_url text NOT NULL DEFAULT 'https://live.trading212.com/api/v0';

-- Add active_broker_mode to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS active_broker_mode text NOT NULL DEFAULT 'live';

-- Drop old unique constraint and create new one with mode
-- (only if old constraint exists — idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trading212_connections_user_id_broker_key'
  ) THEN
    ALTER TABLE trading212_connections
      DROP CONSTRAINT trading212_connections_user_id_broker_key;
  END IF;
END $$;

-- Create unique constraint on (user_id, broker, mode)
ALTER TABLE trading212_connections
  DROP CONSTRAINT IF EXISTS trading212_connections_user_id_broker_mode_key;

ALTER TABLE trading212_connections
  ADD CONSTRAINT trading212_connections_user_id_broker_mode_key
  UNIQUE (user_id, broker, mode);

-- Update existing rows to have mode = 'live'
UPDATE trading212_connections
SET mode = 'live',
    base_url = 'https://live.trading212.com/api/v0'
WHERE mode IS NULL OR mode = '';
