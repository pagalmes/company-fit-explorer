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
    -- profile_status must be 'complete' so E2E tests skip onboarding and reach the graph
    INSERT INTO profiles (id, email, full_name, role, profile_status)
    VALUES (
      test_user_id,
      test_email,
      'Test User',
      'user',
      'complete'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create initial user_company_data with sample companies for E2E testing.
    -- Includes enough companies for watchlist, graph interaction, and detail panel tests.
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
        'targetCompanies', 'Technology companies',
        'baseCompanies', '[
          {"id":1,"name":"Acme Corp","logo":"https://img.logo.dev/acme.com?token=pk_test","careerUrl":"https://acme.com/careers","matchScore":92,"industry":"Software","stage":"Series B","location":"San Francisco, CA","employees":"200-500","remote":"Hybrid","openRoles":5,"connections":[2,3],"connectionTypes":{"2":"industry","3":"stage"},"matchReasons":["Great culture fit","Strong engineering team"],"color":"#3B82F6","angle":0,"distance":200},
          {"id":2,"name":"Beta Inc","logo":"https://img.logo.dev/beta.com?token=pk_test","careerUrl":"https://beta.com/careers","matchScore":85,"industry":"Software","stage":"Series A","location":"New York, NY","employees":"50-200","remote":"Remote","openRoles":3,"connections":[1,4],"connectionTypes":{"1":"industry","4":"industry"},"matchReasons":["Remote friendly","Fast growth"],"color":"#10B981","angle":72,"distance":200},
          {"id":3,"name":"Gamma Ltd","logo":"https://img.logo.dev/gamma.com?token=pk_test","careerUrl":"https://gamma.com/careers","matchScore":78,"industry":"Fintech","stage":"Series C","location":"Austin, TX","employees":"500-1000","remote":"On-site","openRoles":8,"connections":[1,5],"connectionTypes":{"1":"stage","5":"industry"},"matchReasons":["Interesting domain","Competitive pay"],"color":"#F59E0B","angle":144,"distance":200},
          {"id":4,"name":"Delta Systems","logo":"https://img.logo.dev/delta.com?token=pk_test","careerUrl":"https://delta.com/careers","matchScore":71,"industry":"Healthcare","stage":"Series B","location":"Boston, MA","employees":"200-500","remote":"Hybrid","openRoles":2,"connections":[2],"connectionTypes":{"2":"location"},"matchReasons":["Mission driven","Good benefits"],"color":"#EF4444","angle":216,"distance":200},
          {"id":5,"name":"Epsilon AI","logo":"https://img.logo.dev/epsilon.com?token=pk_test","careerUrl":"https://epsilon.com/careers","matchScore":88,"industry":"AI/ML","stage":"Series A","location":"Seattle, WA","employees":"50-200","remote":"Remote","openRoles":6,"connections":[3],"connectionTypes":{"3":"stage"},"matchReasons":["Cutting edge AI","Top talent"],"color":"#8B5CF6","angle":288,"distance":200}
        ]'::jsonb
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
    RAISE NOTICE 'Test user already exists: %, updating company data for E2E tests', test_email;
  END IF;

  -- Always ensure the test user has sample companies (unconditional upsert).
  -- Runs regardless of whether the row was just created or already existed.
  -- Overwrites baseCompanies only if currently empty/missing — never clobbers real data.
  UPDATE user_company_data
  SET user_profile = jsonb_set(
    COALESCE(user_profile, '{}'::jsonb),
    '{baseCompanies}',
    '[
      {"id":1,"name":"Acme Corp","logo":"https://img.logo.dev/acme.com?token=pk_test","careerUrl":"https://acme.com/careers","matchScore":92,"industry":"Software","stage":"Series B","location":"San Francisco, CA","employees":"200-500","remote":"Hybrid","openRoles":5,"connections":[2,3],"connectionTypes":{"2":"industry","3":"stage"},"matchReasons":["Great culture fit","Strong engineering team"],"color":"#3B82F6","angle":0,"distance":200},
      {"id":2,"name":"Beta Inc","logo":"https://img.logo.dev/beta.com?token=pk_test","careerUrl":"https://beta.com/careers","matchScore":85,"industry":"Software","stage":"Series A","location":"New York, NY","employees":"50-200","remote":"Remote","openRoles":3,"connections":[1,4],"connectionTypes":{"1":"industry","4":"industry"},"matchReasons":["Remote friendly","Fast growth"],"color":"#10B981","angle":72,"distance":200},
      {"id":3,"name":"Gamma Ltd","logo":"https://img.logo.dev/gamma.com?token=pk_test","careerUrl":"https://gamma.com/careers","matchScore":78,"industry":"Fintech","stage":"Series C","location":"Austin, TX","employees":"500-1000","remote":"On-site","openRoles":8,"connections":[1,5],"connectionTypes":{"1":"stage","5":"industry"},"matchReasons":["Interesting domain","Competitive pay"],"color":"#F59E0B","angle":144,"distance":200},
      {"id":4,"name":"Delta Systems","logo":"https://img.logo.dev/delta.com?token=pk_test","careerUrl":"https://delta.com/careers","matchScore":71,"industry":"Healthcare","stage":"Series B","location":"Boston, MA","employees":"200-500","remote":"Hybrid","openRoles":2,"connections":[2],"connectionTypes":{"2":"location"},"matchReasons":["Mission driven","Good benefits"],"color":"#EF4444","angle":216,"distance":200},
      {"id":5,"name":"Epsilon AI","logo":"https://img.logo.dev/epsilon.com?token=pk_test","careerUrl":"https://epsilon.com/careers","matchScore":88,"industry":"AI/ML","stage":"Series A","location":"Seattle, WA","employees":"50-200","remote":"Remote","openRoles":6,"connections":[3],"connectionTypes":{"3":"stage"},"matchReasons":["Cutting edge AI","Top talent"],"color":"#8B5CF6","angle":288,"distance":200}
    ]'::jsonb,
    true  -- create_missing: insert key even if user_profile doesn't have it yet
  )
  WHERE user_id = test_user_id
    AND COALESCE(jsonb_array_length(user_profile->'baseCompanies'), 0) = 0;
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
