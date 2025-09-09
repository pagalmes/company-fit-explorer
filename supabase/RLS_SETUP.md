# Row Level Security (RLS) Setup Guide

## 🔒 Security Status

**CRITICAL**: Your database currently has RLS disabled, which means anyone with your anon key can access ALL data!

## 📋 Quick Setup

### Step 1: Check Current Status

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Run the contents of `check_rls_status.sql`
4. You should see which tables have RLS disabled (likely all of them)

### Step 2: Enable RLS and Policies

1. In the SQL Editor, run the contents of `enable_rls_policies.sql`
2. This script will:
   - ✅ Enable RLS on all tables
   - ✅ Create secure policies for each table
   - ✅ Set up proper permissions

### Step 3: Verify Setup

Run `check_rls_status.sql` again to confirm:
- All tables show "✅ ENABLED"
- Each table has multiple policies

## 🛡️ What These Policies Do

### **profiles** Table
- Users can view and update their own profile
- Users cannot change their own role (prevents privilege escalation)
- Admins can view and manage all profiles
- New users can create their profile during signup

### **user_company_data** Table
- Users can only access their own company data
- Full CRUD operations for own data
- Admins can view and manage all data

### **user_preferences** Table
- Users can only access their own preferences
- Full CRUD operations for own preferences

### **user_invitations** Table
- Only admins can create and manage invitations
- Service role (your API) can check invitations for signup

## 🚨 Important Security Notes

1. **Before Production**: Always enable RLS before going live
2. **Test Thoroughly**: After enabling, test your app to ensure everything works
3. **Admin Access**: Make sure you have at least one admin user before enabling
4. **Service Role Key**: Keep your service role key SECRET (never expose in client code)

## 🧪 Testing After Setup

### Test User Access
```sql
-- As a regular user (use Supabase Auth UI to test)
SELECT * FROM profiles; -- Should only see own profile
SELECT * FROM user_company_data; -- Should only see own data
```

### Test Admin Access
```sql
-- As an admin user
SELECT * FROM profiles; -- Should see all profiles
SELECT * FROM user_invitations; -- Should see all invitations
```

### Test Unauthorized Access
```sql
-- Try to update another user's data (should fail)
UPDATE profiles SET full_name = 'Hacked' WHERE id != auth.uid();
-- This should return 0 rows affected
```

## 🔧 Troubleshooting

### If you get locked out:
1. Use the Supabase Dashboard (it uses service role)
2. Temporarily disable RLS: `ALTER TABLE tablename DISABLE ROW LEVEL SECURITY;`
3. Fix the issue
4. Re-enable RLS: `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;`

### If the app stops working after enabling RLS:
1. Check that your API routes use the service role key for admin operations
2. Verify that authentication is working properly
3. Check the Supabase logs for policy violations

## 📝 Policy Modifications

If you need to modify policies:
1. First drop the old policy: `DROP POLICY "policy_name" ON table_name;`
2. Then create the new policy with CREATE POLICY

## ✅ Checklist Before Production

- [ ] RLS enabled on all tables
- [ ] Policies tested with different user roles
- [ ] Admin user account created and working
- [ ] Service role key stored securely (environment variable)
- [ ] No sensitive data exposed in client-side code
- [ ] Authentication flow tested end-to-end

## 🆘 Help

If you encounter issues:
1. Check Supabase Dashboard → Database → Policies
2. Review logs in Supabase Dashboard → Logs → Postgres Logs
3. Ensure your client code handles auth properly