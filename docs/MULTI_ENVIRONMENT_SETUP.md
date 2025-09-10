# Multi-Environment Supabase Setup Guide

## Recommended Approach: Separate Supabase Projects

The cleanest and safest approach is to use **two separate Supabase projects** - one for development and one for production.

### Option 1: Two Separate Projects (Recommended)

#### Advantages:
- Complete isolation between dev and prod data
- No risk of accidentally affecting production
- Different security rules can be tested safely
- Independent rate limits and quotas
- Can test database migrations safely

#### Setup Steps:

1. **Create Two Supabase Projects:**
   - `your-app-dev` - For development
   - `your-app-prod` - For production

2. **Local Development (.env.local):**
   ```env
   # Development Supabase Project
   NEXT_PUBLIC_SUPABASE_URL=https://your-app-dev.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=dev-anon-key
   SUPABASE_SERVICE_ROLE_KEY=dev-service-role-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. **Production (Vercel Environment Variables):**
   ```env
   # Production Supabase Project
   NEXT_PUBLIC_SUPABASE_URL=https://your-app-prod.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
   SUPABASE_SERVICE_ROLE_KEY=prod-service-role-key
   NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
   ```

4. **Configure Each Supabase Project:**
   
   **Development Project:**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: 
     ```
     http://localhost:3000/**
     http://localhost:3000
     ```

   **Production Project:**
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs:
     ```
     https://your-app.vercel.app/**
     https://your-app.vercel.app
     ```

### Option 2: Single Project with Multiple Redirect URLs (Quick Fix)

If you need to use a single Supabase project temporarily:

1. **In Supabase Dashboard → Authentication → URL Configuration:**
   
   - **Site URL**: Set to your production URL (this is what goes in emails)
   - **Redirect URLs**: Add BOTH:
     ```
     http://localhost:3000/**
     http://localhost:3000
     https://your-app.vercel.app/**
     https://your-app.vercel.app
     ```

2. **Override the redirect URL in code for development:**

   Update `app/login/page.tsx`:
   ```typescript
   const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
   const { error } = await supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${siteUrl}/reset-password`
   })
   ```

   This way, the code explicitly sets the redirect based on the environment.

### Option 3: Supabase Branches (Beta Feature)

Supabase now offers database branching for Pro plans:

1. Create a branch from your main project
2. Each branch gets its own URL and keys
3. Perfect for preview deployments

**Note:** This is a newer feature and may have limitations.

## Migration Strategy: From Single to Dual Projects

If you're currently using one project and want to migrate:

### Step 1: Create Development Project
1. Create new Supabase project for development
2. Export schema from production using Supabase CLI:
   ```bash
   npx supabase db dump --db-url "postgresql://..." > schema.sql
   ```
3. Import schema to dev project:
   ```bash
   npx supabase db push --db-url "postgresql://..." < schema.sql
   ```

### Step 2: Update Local Environment
1. Update `.env.local` with dev project credentials
2. Test thoroughly locally

### Step 3: Keep Production Unchanged
1. Production continues using original project
2. Update Vercel environment variables only if needed

## Database Synchronization

### Using Supabase CLI for Schema Management

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Initialize in your project:**
   ```bash
   supabase init
   ```

3. **Link to your projects:**
   ```bash
   # For development
   supabase link --project-ref your-dev-project-ref
   
   # For production (in CI/CD)
   supabase link --project-ref your-prod-project-ref
   ```

4. **Create migrations:**
   ```bash
   supabase migration new add_user_preferences
   ```

5. **Apply migrations:**
   ```bash
   # To development
   supabase db push
   
   # To production (through CI/CD)
   supabase db push --project-ref your-prod-project-ref
   ```

## Environment-Specific Features

### Development-Only Features
```typescript
// In your code
const isDevelopment = process.env.NODE_ENV === 'development'

if (isDevelopment) {
  // Enable debug features
  // Use relaxed rate limits
  // Show detailed error messages
}
```

### Production-Only Features
```typescript
const isProduction = process.env.NODE_ENV === 'production'

if (isProduction) {
  // Enable analytics
  // Use strict security rules
  // Send error reports to monitoring service
}
```

## Quick Decision Guide

### Use Two Projects When:
- You have sensitive production data
- You need to test database migrations
- You want complete isolation
- You're on Supabase Free tier (2 projects allowed)

### Use Single Project When:
- You're just prototyping
- You have very simple auth needs
- You're on a tight budget
- You're the only developer

### Use Branches When:
- You're on Supabase Pro plan
- You need preview deployments
- You have multiple developers
- You want automatic cleanup

## Immediate Solution for Your Case

Since you have a production deployment that needs fixing now:

1. **Quick Fix (Today):**
   - Add both localhost and production URLs to Redirect URLs in Supabase
   - Keep Site URL as production (for emails)
   - The code change already made will handle the redirect properly

2. **Proper Solution (This Week):**
   - Create a new Supabase project for development
   - Migrate your schema
   - Update local .env.local
   - Keep production as-is

3. **Long-term (This Month):**
   - Set up Supabase CLI
   - Implement migration workflow
   - Consider database branches if on Pro plan

## Checklist for Multi-Environment Setup

- [ ] Decide on strategy (separate projects vs. single project)
- [ ] Create development Supabase project (if using separate)
- [ ] Configure Site URLs in each project
- [ ] Set up environment variables locally
- [ ] Configure Vercel environment variables
- [ ] Test password reset in both environments
- [ ] Document the setup for your team
- [ ] Set up database migration workflow