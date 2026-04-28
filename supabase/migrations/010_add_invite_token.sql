-- Migration: add custom invite token columns to invitations table

BEGIN;

ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');

CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_idx ON invitations(token);

COMMIT;
