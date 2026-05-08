-- Multi-industry platform migration
-- Adds industry field to tenants and scenarios, converts associate_type to text

-- 1. Add industry to tenants (default 'optical' preserves all existing data)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS industry text NOT NULL DEFAULT 'optical';

-- 2. Add industry to scenarios (default 'optical' preserves all existing data)
ALTER TABLE scenarios
  ADD COLUMN IF NOT EXISTS industry text NOT NULL DEFAULT 'optical';

-- 3. Convert associate_type enum to text to support new types across industries
--    First change the column type, then drop the old enum
ALTER TABLE scenarios
  ALTER COLUMN associate_type TYPE text;

DROP TYPE IF EXISTS associate_type;

-- 4. Backfill existing rows to ensure consistency
UPDATE tenants  SET industry = 'optical' WHERE industry IS NULL OR industry = '';
UPDATE scenarios SET industry = 'optical' WHERE industry IS NULL OR industry = '';

-- 5. Add industry to invitations table so invited users inherit it automatically
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS industry text NOT NULL DEFAULT 'optical';

-- Backfill existing invitations from their tenant's industry
UPDATE invitations i
SET    industry = t.industry
FROM   tenants t
WHERE  i.tenant_id = t.id;
