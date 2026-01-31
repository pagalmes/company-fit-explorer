-- ⚠️  WARNING: DEVELOPMENT ONLY - DO NOT RUN IN PRODUCTION ⚠️
-- This file contains test credentials in plaintext.
-- ============================================================================
--
-- Seed Test User for Development and E2E Testing
-- This migration creates a test user for local development and automated testing
--
-- Credentials (from .env.example):
--   Email: test@example.com
--   Password: testpassword123
--
-- Usage:
--   1. Run this migration in Supabase SQL Editor after running 001_initial_schema.sql
--   2. The test user will be created with these default credentials
--   3. E2E tests will use these credentials automatically

-- ============================================================================
-- Create Test User in Supabase Auth
-- ============================================================================
-- This creates a test user account that can be used for E2E testing
-- The password is hashed using Supabase's built-in auth system

DO $$
DECLARE
  test_user_id UUID;
  test_email TEXT := 'test@example.com';
  test_password TEXT := 'testpassword123';
BEGIN
  -- Check if user already exists
  SELECT id INTO test_user_id
  FROM auth.users
  WHERE email = test_email;

  IF test_user_id IS NULL THEN
    -- Create the user in auth.users
    -- Note: This uses Supabase's internal auth functions
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      test_email,
      crypt(test_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Test User"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO test_user_id;

    -- Create identity for email/password auth (required for login)
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      test_user_id,
      jsonb_build_object('sub', test_user_id::text, 'email', test_email, 'email_verified', true),
      'email',
      test_user_id::text,
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT DO NOTHING;

    -- Create profile for the test user (if it doesn't exist)
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
      test_user_id,
      test_email,
      'Test User',
      'user'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create initial user_company_data (empty profile) if it doesn't exist
    INSERT INTO user_company_data (user_id, user_profile, companies)
    VALUES (
      test_user_id,
      jsonb_build_object(
        'id', 'test-user',
        'name', 'Test User',
        'mustHaves', '[]'::jsonb,
        'wantToHave', '[]'::jsonb,
        'experience', '[]'::jsonb,
        'targetRole', 'Software Engineer',
        'targetCompanies', 'Technology companies'
      ),
      '[]'::jsonb
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Create initial user_preferences (empty watchlist) if it doesn't exist
    INSERT INTO user_preferences (user_id, watchlist_company_ids, removed_company_ids, view_mode)
    VALUES (
      test_user_id,
      '{}',
      '{}',
      'explore'
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Test user created successfully: %', test_email;
  ELSE
    RAISE NOTICE 'Test user already exists: %', test_email;
  END IF;
END $$;

-- ============================================================================
-- Verification
-- ============================================================================
-- Verify the test user was created successfully
SELECT
  u.id,
  u.email,
  p.full_name,
  p.role,
  u.email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'test@example.com';
