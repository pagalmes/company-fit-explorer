# Logo System Architecture

## Overview

Cosmos uses a centralized logo system that fetches company logos from Logo.dev through a CORS-safe proxy. This system replaces the deprecated Clearbit Logo API.

## Architecture

### Components

1. **Logo Provider** (`src/utils/logoProvider.ts`)
   - Core utility for generating logo URLs
   - Handles Logo.dev integration
   - Provides fallback avatar generation

2. **Logo Proxy API** (`app/api/logo/route.ts`)
   - Server-side proxy for Logo.dev API
   - Adds CORS headers for client-side canvas rendering
   - Implements caching for performance

3. **Logo Migration** (`src/utils/logoMigration.ts`)
   - Client-side migration utility
   - Converts legacy URLs to proxy format
   - Handles fallback avatar conversion

4. **Migration Endpoint** (`app/api/migrate-logos/route.ts`)
   - One-time database migration endpoint
   - Updates all logo URLs in Supabase
   - Runs with service role permissions

## Why a Proxy?

Logo.dev doesn't send `Access-Control-Allow-Origin` headers, which causes CORS errors when:
- Loading images via CSS `background-image` in Cytoscape
- Rendering images on HTML5 Canvas
- Any client-side JavaScript image manipulation

The proxy solves this by:
1. Fetching images server-side (no CORS restrictions)
2. Adding proper CORS headers to responses
3. Caching images to reduce Logo.dev API calls

## Logo URL Formats

### Current Format (Proxy)
```
/api/logo?domain=stripe.com
```

### Legacy Formats (Deprecated)
```
https://img.logo.dev/stripe.com?token=pk_...
https://img.logo.dev/stripe.com?token=pk_...&format=webp&size=128
https://logo.clearbit.com/stripe.com
https://ui-avatars.com/api/?name=ST&background=...
```

## Configuration

### Environment Variables

```env
# Logo.dev API Key (required)
NEXT_PUBLIC_LOGO_DEV_KEY=pk_your_public_key_here
```

Get your free Logo.dev API key at https://logo.dev

## Usage

### Basic Usage

```typescript
import { getCompanyLogo } from '@/utils/logoProvider';

// Generate logo URL
const logoUrl = getCompanyLogo('stripe.com', 'Stripe');
// Returns: /api/logo?domain=stripe.com
```

### With Fallback

```typescript
// If domain is unavailable, generates fallback avatar
const logoUrl = getCompanyLogo(undefined, 'Acme Corp');
// Returns: https://ui-avatars.com/api/?name=AC&background=3B82F6&...
```

### Check if Fallback

```typescript
import { isFallbackLogo } from '@/utils/logoProvider';

if (isFallbackLogo(logoUrl)) {
  // Logo is using ui-avatars fallback
}
```

## Migration

### Client-Side Migration

The `logoMigration` utility automatically converts legacy URLs when loading company data:

```typescript
import { migrateCompanyLogos } from '@/utils/logoMigration';

// Migrate an array of companies
const migratedCompanies = migrateCompanyLogos(companies);
```

This happens automatically in `AppContainer.tsx` when loading user data.

### Database Migration

**Status**: ✅ Migration completed on 2025-11-06

The one-time database migration has been completed:
- 13 total users processed
- 11 users updated
- 474 companies migrated to proxy format

The migration endpoint is now **archived** and requires a confirmation header to run:

```bash
# Check migration status (no changes made)
curl -X POST https://your-app.vercel.app/api/migrate-logos

# Re-run migration (only if needed for new users with legacy URLs)
curl -X POST https://your-app.vercel.app/api/migrate-logos \
  -H "X-Confirm-Migration: true"
```

**Response (without confirmation):**
```json
{
  "status": "archived",
  "message": "Logo migration completed on 2025-11-06",
  "stats": {
    "totalUsers": 13,
    "usersUpdated": 11,
    "companiesMigrated": 474
  },
  "note": "Migration already complete. To re-run, add header: X-Confirm-Migration: true"
}
```

## Proxy API Details

### Endpoint
```
GET /api/logo?domain=<company-domain>
```

### Parameters
- `domain` (required): Company domain (e.g., "stripe.com")

### Response Headers
```
Content-Type: image/webp (or original image type)
Cache-Control: public, max-age=86400, stale-while-revalidate=604800
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
```

### Caching Strategy
- **Client Cache**: 24 hours (max-age=86400)
- **Stale While Revalidate**: 7 days (serve stale while fetching fresh)
- **Server**: No server-side cache (relies on HTTP caching)

### Error Handling
- **404**: Logo not found on Logo.dev
- **500**: Server error or Logo.dev API failure

## Fallback System

When Logo.dev doesn't have a logo or domain is unavailable:

1. **Auto-generated Avatar**: Uses ui-avatars.com
2. **Consistent Colors**: Based on company name hash
3. **Initials**: First 2 characters of company name

Example fallback:
```
https://ui-avatars.com/api/?name=AC&background=3B82F6&color=fff&size=128&font-size=0.5&bold=true
```

## Performance Considerations

### Optimization
- WebP format for smaller file sizes
- 128px fixed size (optimal for graph rendering)
- HTTP caching reduces API calls
- Stale-while-revalidate ensures fast response

### Logo.dev API Limits
- Free tier: 10,000 requests/month
- With caching, typical usage: ~100-500 requests/month

## Security

### API Key Safety
- Public key (starts with `pk_`) - safe for client-side use
- Exposed in proxy API requests only (server-side)
- No secret keys in client code

### CORS Headers
- Allows all origins (`*`) - safe for public logos
- Read-only GET requests only
- No sensitive data exposure

## Troubleshooting

### Logos Not Loading

1. **Check environment variable**:
   ```bash
   echo $NEXT_PUBLIC_LOGO_DEV_KEY
   ```

2. **Verify proxy is deployed**:
   ```bash
   curl https://your-app.vercel.app/api/logo?domain=stripe.com
   ```

3. **Check browser console** for CORS errors

### Fallback Avatars Showing

- Logo.dev may not have the company logo
- Domain extraction from careerUrl failed
- Run migration to convert existing fallbacks:
  ```bash
  curl -X POST https://your-app.vercel.app/api/migrate-logos
  ```

### Migration Not Working

- Check Supabase service role key is set
- Verify `user_company_data` table permissions
- Check server logs for detailed errors

## Future Enhancements

### Potential Improvements
- [ ] Add size parameter support to proxy
- [ ] Server-side cache with Redis/Upstash
- [ ] Automatic retries for failed Logo.dev requests
- [ ] Admin UI for manual logo uploads
- [ ] Dark mode logo variants

### API Compatibility
The `getCompanyLogoWithSize()` function is deprecated but maintained for backward compatibility. Use `getCompanyLogo()` instead.

## Related Documentation

- [Logo.dev Documentation](https://docs.logo.dev)
- [Clearbit Migration Guide](https://docs.logo.dev/clearbit-logo-docs)
- [User Profile Architecture](./USER_PROFILE_ARCHITECTURE.md)
- [Persistence Architecture](./PERSISTENCE_ARCHITECTURE.md)

---

*Last Updated: 2025-11-06*
