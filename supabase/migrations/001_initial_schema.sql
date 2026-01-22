-- CMF Explorer Complete Database Schema
-- This is a self-contained migration that sets up the entire database
-- Run this on a fresh Supabase instance to create all tables, indexes, RLS policies, and grants
--
-- Tables created:
--   1. profiles        - User profile data (linked to auth.users)
--   2. user_company_data    - Personalized company lists and CMF profile
--   3. user_preferences     - Watchlist, removed companies, view mode
--   4. user_invitations     - Invite-only access management
--   5. waitlist             - Public waitlist for early access

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: profiles
-- ============================================================================
-- User profile data, linked to Supabase Auth users
-- This table is populated when users sign up via auth

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: user_company_data
-- ============================================================================
-- Stores personalized company lists and CMF (Company Match Fit) profile data
-- Each user has exactly one record (enforced by unique constraint)
--
-- user_profile JSONB structure:
--   {
--     id: string,
--     name: string,
--     mustHaves: string[],
--     wantToHave: string[],
--     experience: string[],
--     targetRole: string,
--     targetCompanies: string
--   }
--
-- companies JSONB structure (array of):
--   {
--     id: number,
--     name: string,
--     logo: string,
--     careerUrl: string,
--     matchScore: number,
--     industry: string,
--     stage: string,
--     location: string,
--     employees: string,
--     remote: string,
--     openRoles: number,
--     connections: number[],
--     connectionTypes: Record<number, string>,
--     matchReasons: string[],
--     color: string,
--     externalLinks?: { website?, linkedin?, glassdoor?, crunchbase? }
--   }

CREATE TABLE IF NOT EXISTS user_company_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_profile JSONB NOT NULL,
  companies JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_company_data_user_id_key UNIQUE (user_id)
);

-- ============================================================================
-- TABLE: user_preferences
-- ============================================================================
-- Stores watchlist, removed companies, and UI preferences
-- Each user has exactly one record (enforced by unique constraint)

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  watchlist_company_ids INTEGER[] DEFAULT '{}',
  removed_company_ids INTEGER[] DEFAULT '{}',
  view_mode TEXT DEFAULT 'explore' CHECK (view_mode IN ('explore', 'watchlist')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_preferences_user_id_key UNIQUE (user_id)
);

-- ============================================================================
-- TABLE: user_invitations
-- ============================================================================
-- Invite-only access management
-- Admins can invite users by email; invitations expire after 7 days

CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  invite_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: waitlist
-- ============================================================================
-- Public waitlist for early access signups
-- Anyone can join; admins can view and mark users as notified

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_company_data_user_id ON user_company_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

-- ============================================================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_company_data_updated_at ON user_company_data;
CREATE TRIGGER update_user_company_data_updated_at
  BEFORE UPDATE ON user_company_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Profiles policies
-- ----------------------------------------------------------------------------

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (for signup flow)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- User company data policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own company data" ON user_company_data;
CREATE POLICY "Users can view their own company data" ON user_company_data
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own company data" ON user_company_data;
CREATE POLICY "Users can insert their own company data" ON user_company_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own company data" ON user_company_data;
CREATE POLICY "Users can update their own company data" ON user_company_data
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own company data" ON user_company_data;
CREATE POLICY "Users can delete their own company data" ON user_company_data
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can access all company data" ON user_company_data;
CREATE POLICY "Admins can access all company data" ON user_company_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- User preferences policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
CREATE POLICY "Users can insert their own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own preferences" ON user_preferences;
CREATE POLICY "Users can delete their own preferences" ON user_preferences
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can access all preferences" ON user_preferences;
CREATE POLICY "Admins can access all preferences" ON user_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- User invitations policies
-- ----------------------------------------------------------------------------

-- Users can view invitations sent to their email
DROP POLICY IF EXISTS "Users can view invitations to their email" ON user_invitations;
CREATE POLICY "Users can view invitations to their email" ON user_invitations
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Users can view invitations they sent
DROP POLICY IF EXISTS "Users can view their sent invitations" ON user_invitations;
CREATE POLICY "Users can view their sent invitations" ON user_invitations
  FOR SELECT USING (auth.uid() = invited_by);

-- Admins can manage all invitations
DROP POLICY IF EXISTS "Admins can manage invitations" ON user_invitations;
CREATE POLICY "Admins can manage invitations" ON user_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Anyone can view invitations by token (for accepting invites while logged out)
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON user_invitations;
CREATE POLICY "Anyone can view invitations by token" ON user_invitations
  FOR SELECT USING (true);

-- Anyone can update invitations (to mark as used when accepting)
DROP POLICY IF EXISTS "Anyone can accept invitations" ON user_invitations;
CREATE POLICY "Anyone can accept invitations" ON user_invitations
  FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- Waitlist policies
-- ----------------------------------------------------------------------------

-- Anyone can join the waitlist (public insert)
DROP POLICY IF EXISTS "Anyone can join waitlist" ON waitlist;
CREATE POLICY "Anyone can join waitlist" ON waitlist
  FOR INSERT TO public
  WITH CHECK (true);

-- Authenticated users can view waitlist (for admin dashboard)
DROP POLICY IF EXISTS "Authenticated users can view waitlist" ON waitlist;
CREATE POLICY "Authenticated users can view waitlist" ON waitlist
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to anon users (for waitlist signup)
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON waitlist TO anon;

-- Grant permissions to service role (for API routes using service key)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- OPTIONAL: Create profile on user signup (auth trigger)
-- ============================================================================
-- This function auto-creates a profile when a user signs up via Supabase Auth
-- Uncomment if you want automatic profile creation

-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO public.profiles (id, email, full_name)
--   VALUES (
--     NEW.id,
--     NEW.email,
--     COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
--   );
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
