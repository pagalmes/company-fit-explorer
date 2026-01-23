# Supabase Setup Guide for Cosmos

This guide walks you through setting up a Supabase instance for the Cosmos application.

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Repository**: Clone this repository

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a name, database password, and region
3. Wait for the project to be created

## Step 2: Get Your Credentials

In your Supabase dashboard:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`)

## Step 3: Configure Environment

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

## Step 4: Create Database Schema

Go to your Supabase dashboard → **SQL Editor** and run the contents of:

**`supabase/migrations/001_initial_schema.sql`**

This creates:
- All core tables (`profiles`, `user_company_data`, `user_preferences`, `user_invitations`, `waitlist`)
- Indexes and triggers
- Row Level Security with all policies
- Permissions for authenticated, anon, and service_role

## Step 5: Enable Auto-Profile Creation (Recommended)

Run this in the SQL Editor to automatically create profiles when users sign up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Step 6: Create Your First Admin User

Since the app is invite-only, you need to manually create the first admin:

1. Go to **Authentication** → **Users** → **Add user**
2. Create a user with your email and a password
3. Copy the user's UUID from the Users table
4. If you enabled the auto-profile trigger (Step 5), promote the user to admin:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
   ```
5. If you didn't enable the trigger, insert the profile manually:
   ```sql
   INSERT INTO profiles (id, email, full_name, role)
   VALUES (
     'paste-uuid-here',
     'your-email@example.com',
     'Your Name',
     'admin'
   );
   ```

## Step 7: Verify Tables Created

In Supabase dashboard → **Table Editor**, you should see:
- `profiles` - User authentication data
- `user_company_data` - Personalized company lists
- `user_preferences` - Watchlist and UI preferences
- `user_invitations` - Invite system
- `waitlist` - Public waitlist signups

## Step 8: Start the Application

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` - you should see the app ready to use.

---

## Database Schema Overview

### Core Tables

#### `profiles`
- Stores user account information
- Links to Supabase Auth users
- Includes role-based access (admin/user)

#### `user_company_data`
- Stores each user's personalized company list
- Contains CMF profile data (skills, preferences)
- JSONB format for flexible data structure

#### `user_preferences`
- User's watchlist company IDs
- Removed company IDs
- UI preferences (view mode, etc.)

#### `user_invitations`
- Manages invite-only access
- Tracks invitation tokens and usage
- Links to inviting user

#### `waitlist`
- Public waitlist for early access signups

### Key Features

- **Row Level Security**: Users can only access their own data
- **Admin Access**: Admin users can manage all data
- **Automatic Timestamps**: `created_at` and `updated_at` auto-managed
- **Foreign Key Constraints**: Data integrity enforcement

---

## Security Configuration

### Row Level Security (RLS)

RLS is enabled by default with these policies:

- **Users**: Can only read/write their own data
- **Admins**: Can access all data across users
- **Service Role**: Full access for API operations

### Development vs Production

**Development:**
- RLS can be temporarily disabled for debugging
- Detailed logging enabled

**Production:**
- Ensure RLS is enabled
- Use service role key only in API routes (server-side)

---

## Troubleshooting

### Common Issues

#### "Permission denied" errors
- Check that RLS policies are properly set up
- Verify service role key is used in API routes
- Ensure user is authenticated for client operations

#### "Table doesn't exist" errors
- Run the migration SQL in the SQL Editor
- Check Supabase dashboard → Table Editor
- Verify SQL executed without errors

#### "Invalid credentials" errors
- Double-check `.env.local` file exists
- Verify Supabase URL and keys are correct
- Ensure no extra spaces in environment variables

#### Connection timeout
- Check your internet connection
- Verify Supabase project is running (not paused)
- Try refreshing your Supabase dashboard

### Getting Help

1. **Check the Supabase Logs**: Dashboard → Logs → API logs
2. **Browser Console**: Check for network errors
3. **Server Logs**: Check terminal output for API errors
4. **Sample Queries**: Test database access in Supabase SQL Editor

### Debugging

Check table structure in Supabase SQL Editor:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

---

## Database Migrations

### Adding New Migrations

1. Create new file: `supabase/migrations/002_your_migration.sql`
2. Run the SQL in Supabase SQL Editor
3. Document changes in this guide

### Migration Best Practices

- **Incremental**: Each migration should be self-contained
- **Reversible**: Consider how to undo changes if needed
- **Tested**: Test migrations on a copy of production data
- **Documented**: Update this guide with schema changes

---

## Monitoring and Maintenance

### Regular Tasks

1. **Monitor Usage**: Check Supabase dashboard for usage metrics
2. **Backup Data**: Set up automated backups for production
3. **Update Policies**: Review and update RLS policies as needed
4. **Clean Old Data**: Archive or remove old invitation records

### Performance Optimization

- **Indexes**: Add indexes for frequently queried columns
- **JSONB Queries**: Use GIN indexes for JSONB columns if needed
- **Connection Pooling**: Monitor connection usage
- **Query Analysis**: Use EXPLAIN for slow queries
