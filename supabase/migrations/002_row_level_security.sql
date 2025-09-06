-- Row Level Security (RLS) Policies for CMF Explorer
-- This migration sets up security policies to ensure users can only access their own data

-- Enable RLS on all user tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Users can read and update their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User company data policies
-- Users can only access their own company data
CREATE POLICY "Users can view their own company data" ON user_company_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company data" ON user_company_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company data" ON user_company_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company data" ON user_company_data
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can access all company data
CREATE POLICY "Admins can access all company data" ON user_company_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User preferences policies
-- Users can only access their own preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can access all preferences
CREATE POLICY "Admins can access all preferences" ON user_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User invitations policies
-- Users can view invitations sent to their email
CREATE POLICY "Users can view invitations to their email" ON user_invitations
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Admins can manage all invitations
CREATE POLICY "Admins can manage invitations" ON user_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users who sent invitations can view them
CREATE POLICY "Users can view their sent invitations" ON user_invitations
  FOR SELECT USING (auth.uid() = invited_by);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role (for API routes)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Note: During development, RLS can be temporarily disabled by running:
-- ALTER TABLE user_company_data DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
-- Remember to re-enable before production deployment!