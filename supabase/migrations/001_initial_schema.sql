-- CMF Explorer Initial Database Schema
-- This migration sets up the core tables for user data and preferences

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (typically created by Supabase Auth)
-- This is usually auto-created, but included for completeness
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User company data table
-- Stores personalized company lists and CMF profile data
CREATE TABLE user_company_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_profile JSONB NOT NULL,        -- CMF data (skills, preferences, etc.)
  companies JSONB NOT NULL DEFAULT '[]'::jsonb,  -- User's personalized companies array
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User preferences table  
-- Stores watchlist, removed companies, and UI preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  watchlist_company_ids INTEGER[] DEFAULT '{}',
  removed_company_ids INTEGER[] DEFAULT '{}',
  view_mode TEXT DEFAULT 'explore' CHECK (view_mode IN ('explore', 'watchlist')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User invitations table (for invite-only access)
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  invite_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create unique constraints
ALTER TABLE user_company_data ADD CONSTRAINT user_company_data_user_id_key UNIQUE (user_id);
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);

-- Create indexes for better performance
CREATE INDEX idx_user_company_data_user_id ON user_company_data(user_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_invitations_token ON user_invitations(invite_token);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);

-- Create function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_company_data_updated_at BEFORE UPDATE ON user_company_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development (optional)
-- This creates a demo user with sample company data
DO $$
BEGIN
  -- Only insert if no data exists (for development)
  IF NOT EXISTS (SELECT 1 FROM user_company_data LIMIT 1) THEN
    -- Create a sample user profile (this would normally be created by auth)
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
      '0a82a1dd-adf1-45c7-a83c-69f064f3bf47',
      'demo@example.com',
      'Demo User',
      'user'
    ) ON CONFLICT (id) DO NOTHING;

    -- Insert sample user company data
    INSERT INTO user_company_data (user_id, user_profile, companies)
    VALUES (
      '0a82a1dd-adf1-45c7-a83c-69f064f3bf47',
      '{
        "id": "user-1",
        "name": "Demo User - Updated",
        "mustHaves": ["Remote work", "Good work-life balance", "Competitive salary"],
        "experience": ["React", "TypeScript", "Node.js", "Python"],
        "targetRole": "Senior Software Engineer",
        "wantToHave": ["Startup environment", "Learning opportunities"],
        "targetCompanies": "Tech startups and established companies"
      }'::jsonb,
      '[
        {
          "id": 1,
          "logo": "https://ui-avatars.com/api/?name=Example+Corp&background=10B981&color=fff",
          "name": "Example Corp",
          "color": "#10B981",
          "stage": "Late Stage",
          "remote": "Remote-Friendly",
          "industry": "Technology",
          "location": "San Francisco, CA",
          "employees": "500-1000",
          "openRoles": 5,
          "matchScore": 85,
          "connections": [],
          "matchReasons": ["Great culture", "Competitive salary", "Remote work"],
          "connectionTypes": {}
        },
        {
          "id": 1002,
          "logo": "https://ui-avatars.com/api/?name=New+Tech&background=3B82F6&color=fff",
          "name": "New Tech Company - ADDED via API",
          "color": "#3B82F6",
          "stage": "Series A",
          "remote": "Fully Remote",
          "industry": "AI/ML",
          "location": "Austin, TX",
          "employees": "50-100",
          "openRoles": 3,
          "matchScore": 92,
          "connections": [],
          "matchReasons": ["Cutting-edge technology", "Remote-first culture", "High growth potential"],
          "connectionTypes": {}
        }
      ]'::jsonb
    );

    -- Insert sample user preferences
    INSERT INTO user_preferences (user_id, watchlist_company_ids, removed_company_ids, view_mode)
    VALUES (
      '0a82a1dd-adf1-45c7-a83c-69f064f3bf47',
      ARRAY[1, 1002],
      ARRAY[]::integer[],
      'explore'
    );

    RAISE NOTICE 'Sample data inserted successfully for development';
  END IF;
END $$;