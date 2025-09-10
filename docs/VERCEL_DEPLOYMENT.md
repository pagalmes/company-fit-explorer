# Vercel Deployment Configuration

## Environment Variables for Production

When deploying to Vercel, you need to configure the following environment variables in your Vercel project settings:

### Required Environment Variables

1. **`NEXT_PUBLIC_SUPABASE_URL`**
   - Your Supabase project URL
   - Example: `https://your-project.supabase.co`

2. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
   - Your Supabase anonymous key
   - Found in Supabase Dashboard > Settings > API

3. **`SUPABASE_SERVICE_ROLE_KEY`**
   - Your Supabase service role key (keep this secret!)
   - Found in Supabase Dashboard > Settings > API

4. **`NEXT_PUBLIC_SITE_URL`** ⚠️ **CRITICAL FOR PASSWORD RESET**
   - Your production domain URL
   - Example: `https://your-app.vercel.app` or `https://yourdomain.com`
   - **Without this, password reset emails will redirect to localhost!**

### Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with its production value
4. Make sure to select the appropriate environments (Production, Preview, Development)

## Supabase Dashboard Configuration (CRITICAL)

### Configure Site URL in Supabase

**This is the most important step for fixing password reset redirects!**

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication → URL Configuration**
4. Set the following:

   - **Site URL**: Set this to your production URL (e.g., `https://your-app.vercel.app`)
   - **Redirect URLs**: Add your production URLs:
     ```
     https://your-app.vercel.app/**
     https://your-app.vercel.app
     ```
   - Remove or comment out localhost URLs for production

### Email Templates (Optional but Recommended)

1. Navigate to **Authentication → Email Templates**
2. Check the "Reset Password" template
3. The template uses `{{ .SiteURL }}` which will now point to your production URL

## Troubleshooting Password Reset Issues

### Problem: Password reset emails still redirect to localhost

**Solution:**
1. Verify `NEXT_PUBLIC_SITE_URL` is set correctly in Vercel
2. **Most importantly**: Check Supabase Dashboard → Authentication → URL Configuration → Site URL
3. Clear your browser cache and try again

### Problem: Password reset link shows "Invalid token" error

**Solution:**
1. Ensure the `/reset-password` page exists (it does in this project)
2. Check that the redirect URLs in Supabase include your domain
3. Verify tokens aren't expired (default is 1 hour)

## Development vs Production Configuration

### Local Development (.env.local)
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Production (Vercel Environment Variables)
```env
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

### Using Vercel's System Environment Variables

Vercel provides `VERCEL_URL` automatically, but it's not recommended for production because:
- It changes for preview deployments
- It doesn't include the protocol (https://)
- Custom domains won't be reflected

Instead, always set `NEXT_PUBLIC_SITE_URL` explicitly to your production domain.

## Security Best Practices

1. **Never commit `.env.local` to git** (it's already in .gitignore)
2. **Keep `SUPABASE_SERVICE_ROLE_KEY` secret** - only add it to Vercel, never expose it client-side
3. **Use different Supabase projects** for development and production if possible
4. **Regularly rotate your service role keys**

## Quick Checklist for Deployment

- [ ] Set all environment variables in Vercel dashboard
- [ ] Configure Site URL in Supabase Dashboard
- [ ] Add production URLs to Redirect URLs in Supabase
- [ ] Test password reset flow after deployment
- [ ] Verify admin functions work with proper authentication