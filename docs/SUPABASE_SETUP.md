# Supabase Setup Guide for CMF Explorer

This guide walks you through setting up a Supabase instance for the CMF Explorer application.

## 🚀 Quick Setup (Automated)

### Prerequisites
1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Node.js**: Ensure you have Node.js installed
3. **Repository**: Clone this repository

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a name, database password, and region
3. Wait for the project to be created (takes ~2 minutes)

### Step 2: Get Your Credentials

In your Supabase dashboard:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`)

### Step 3: Configure Environment

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

### Step 4: Run Automated Setup

```bash
# Install dependencies (if not already done)
npm install

# Run the automated setup script
node scripts/setup-supabase.js
```

The script will:
- ✅ Create all required database tables
- ✅ Set up Row Level Security policies  
- ✅ Insert sample data for development
- ✅ Validate the setup

### Step 5: Start the Application

```bash
npm run dev
```

Visit `http://localhost:3000` - you should see the CMF Explorer with sample data!

---

## 🔧 Manual Setup (If Automated Setup Fails)

If the automated setup doesn't work, follow these manual steps:

### 1. Create Database Schema

Go to your Supabase dashboard → **SQL Editor** and run these files in order:

1. **Run `supabase/migrations/001_initial_schema.sql`**
   - Creates core tables (`profiles`, `user_company_data`, `user_preferences`, `user_invitations`)
   - Sets up indexes and triggers
   - Inserts sample data

2. **Run `supabase/migrations/002_row_level_security.sql`**
   - Enables Row Level Security
   - Creates policies for data access control
   - Sets up admin and user permissions

### 2. Verify Tables Created

In Supabase dashboard → **Table Editor**, you should see:
- `profiles` - User authentication data
- `user_company_data` - Personalized company lists
- `user_preferences` - Watchlist and UI preferences  
- `user_invitations` - Invite system (optional)

### 3. Test the Application

Start your dev server and verify everything works:

```bash
npm run dev
```

---

## 🗂️ Database Schema Overview

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

#### `user_invitations` (Optional)
- Manages invite-only access
- Tracks invitation tokens and usage
- Links to inviting user

### Key Features

- **Row Level Security**: Users can only access their own data
- **Admin Access**: Admin users can manage all data
- **Sample Data**: Development-ready sample data included
- **Automatic Timestamps**: `created_at` and `updated_at` auto-managed
- **Foreign Key Constraints**: Data integrity enforcement

---

## 🔐 Security Configuration

### Row Level Security (RLS)

RLS is enabled by default with these policies:

- **Users**: Can only read/write their own data
- **Admins**: Can access all data across users
- **Service Role**: Full access for API operations

### Development vs Production

**Development:**
- Sample data is automatically created
- RLS can be temporarily disabled for debugging
- Detailed logging enabled

**Production:**  
- Remove sample data before deployment
- Ensure RLS is enabled
- Use service role key only in API routes (server-side)

---

## 🐛 Troubleshooting

### Common Issues

#### "Permission denied" errors
- Check that RLS policies are properly set up
- Verify service role key is used in API routes
- Ensure user is authenticated for client operations

#### "Table doesn't exist" errors  
- Run the migration scripts in order
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

### Debugging Commands

```bash
# Test database connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('$NEXT_PUBLIC_SUPABASE_URL', '$SUPABASE_SERVICE_ROLE_KEY');
supabase.from('profiles').select('count').then(r => console.log('Connection:', r.error ? 'Failed' : 'Success'));
"

# Check table structure  
# Run in Supabase SQL Editor:
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

---

## 🔄 Database Migrations

### Adding New Migrations

1. Create new file: `supabase/migrations/003_your_migration.sql`
2. Add the migration to `scripts/setup-supabase.js`
3. Test locally first
4. Document changes in this guide

### Migration Best Practices

- **Incremental**: Each migration should be self-contained
- **Reversible**: Consider how to undo changes if needed  
- **Tested**: Test migrations on a copy of production data
- **Documented**: Update this guide with schema changes

---

## 📊 Monitoring and Maintenance

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

---

Your CMF Explorer database is now ready! 🚀