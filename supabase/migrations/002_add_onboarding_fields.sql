-- Migration: Add onboarding tracking fields to profiles table
-- Part of: Onboarding Flow Refactoring (Epic #103)
-- Issue: #95
--
-- This migration adds:
--   1. profile_status - Tracks onboarding completion state
--   2. onboarding_completed_at - Timestamp when onboarding was completed
--
-- Profile status values:
--   - 'pending': User has not completed onboarding (show onboarding flow)
--   - 'complete': User has valid CMF profile (all fields meet minimums)
--   - 'incomplete': Admin-seeded or partial profile (skip onboarding, may prompt to enhance)

-- ============================================================================
-- ADD NEW COLUMNS
-- ============================================================================

-- Add profile_status column with check constraint
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_status TEXT
  DEFAULT 'pending'
  CHECK (profile_status IN ('pending', 'complete', 'incomplete'));

-- Add onboarding_completed_at timestamp column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ============================================================================
-- MIGRATE EXISTING DATA
-- ============================================================================
-- Set existing users with company data to 'complete' status
-- This ensures users who already completed onboarding don't see it again

UPDATE profiles p
SET
  profile_status = 'complete',
  onboarding_completed_at = COALESCE(
    (SELECT created_at FROM user_company_data WHERE user_id = p.id),
    NOW()
  )
WHERE EXISTS (
  SELECT 1 FROM user_company_data ucd
  WHERE ucd.user_id = p.id
);

-- ============================================================================
-- ADD INDEX FOR COMMON QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_profile_status ON profiles(profile_status);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN profiles.profile_status IS 'Onboarding state: pending (needs onboarding), complete (valid CMF), incomplete (admin-seeded/partial)';
COMMENT ON COLUMN profiles.onboarding_completed_at IS 'Timestamp when user completed the onboarding flow';
