-- ============================================================================
-- 004_contacts.sql
-- Contact Management & 3B7 Outreach Tracking (Epic #148)
-- ============================================================================
-- Stores contacts that users add to companies in their graph.
-- One row per contact. Multiple contacts per (user, company) are allowed;
-- only one should have is_active = true per company at a time (enforced in app).
-- ============================================================================

CREATE TYPE contact_stage AS ENUM (
  'identified',
  'emailed',
  'day3_check',
  'day7_followup',
  'informational_scheduled',
  'completed'
);

CREATE TYPE contact_type AS ENUM (
  'unknown',
  'booster',
  'obligate',
  'curmudgeon'
);

CREATE TYPE contact_source AS ENUM (
  'alumni',
  'first_degree',
  'second_degree',
  'group',
  'cold'
);

CREATE TABLE IF NOT EXISTS contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   INTEGER NOT NULL,           -- References Company.id from app data (not a FK to a table)
  name         TEXT NOT NULL,
  role         TEXT,
  linkedin_url TEXT,
  source       contact_source NOT NULL DEFAULT 'cold',
  stage        contact_stage  NOT NULL DEFAULT 'identified',
  type         contact_type   NOT NULL DEFAULT 'unknown',
  is_active    BOOLEAN NOT NULL DEFAULT FALSE,
  emailed_at   TIMESTAMPTZ,               -- Set when stage moves to 'emailed'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookups by user + company (the most common query pattern)
CREATE INDEX contacts_user_company_idx ON contacts (user_id, company_id);

-- Fast lookup of active contact per company
CREATE INDEX contacts_user_active_idx ON contacts (user_id, company_id, is_active)
  WHERE is_active = TRUE;

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_contacts_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all contacts" ON contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON contacts TO authenticated;
