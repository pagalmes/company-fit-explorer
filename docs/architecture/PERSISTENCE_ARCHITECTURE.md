# CMF Explorer - Persistence Architecture Documentation

## Overview

The CMF Explorer implements a hybrid persistence strategy that adapts to different environments while maintaining production reliability and development flexibility.

## Architecture Principles

### 🎯 **Environment-Aware Strategy**
- **Production**: Always uses database persistence for reliability
- **Development**: Database-first with intelligent file fallbacks for rapid iteration

### 🔒 **Security-First Design**
- Production secrets managed via environment variables
- Development fallbacks never compromise production data
- Clear separation between authenticated and anonymous modes

### 🚀 **Developer Experience Optimization**
- Seamless switching between persistence modes
- Graceful degradation when services are unavailable
- Clear logging for debugging and monitoring

## Persistence Modes

### 1. Database-First Mode (Default)

**When Used:**
- Production environment (always)
- Development environment (default)

**Behavior:**
```
User Action → Save to Database → Success ✅
                ↓ (if fails)
              Fallback to Files (dev only) → Success ✅
```

**Benefits:**
- Tests production flow in development
- Ensures data consistency across environments
- Graceful degradation for development continuity

### 2. File-Only Mode (Development)

**When Used:**
- Development with `NEXT_PUBLIC_DEV_PERSISTENCE_MODE=file-only`
- Rapid prototyping and iteration scenarios

**Behavior:**
```
User Action → Save to Files → Success ✅
```

**Benefits:**
- Fastest iteration cycle
- No external dependencies
- Perfect for UI/UX development

## Configuration

### Environment Variables

```bash
# Production (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Development Persistence Mode (Optional)
NEXT_PUBLIC_DEV_PERSISTENCE_MODE=database-first  # or "file-only"
```

### Mode Selection Logic

```typescript
function getPersistenceMode() {
  if (process.env.NODE_ENV === 'production') {
    return 'database-first'; // Always in production
  }
  
  // Development: Check environment variable
  return process.env.NEXT_PUBLIC_DEV_PERSISTENCE_MODE || 'database-first';
}
```

## Implementation Details

### State Manager Integration

The `ExplorationStateManager` automatically handles persistence based on the configured mode:

```typescript
// User adds/removes companies, updates watchlist, etc.
async persistState() {
  // 1. Always backup to localStorage
  localStorage.setItem('state', JSON.stringify(state));
  
  // 2. Environment-aware persistence
  const mode = this.getPersistenceMode();
  
  if (mode === 'file-only') {
    await this.saveToFileOnly();
  } else {
    await this.saveDatabaseFirst(); // with fallback
  }
}
```

### Database Schema

#### User Company Data
```sql
CREATE TABLE user_company_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  user_profile JSONB,        -- CMF data (skills, preferences)
  companies JSONB,           -- User's personalized companies
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### User Preferences  
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  watchlist_company_ids INTEGER[],
  removed_company_ids INTEGER[],
  view_mode VARCHAR DEFAULT 'explore',
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### GET /api/user/data
Retrieves user's personalized data and preferences.

**Response:**
```json
{
  "hasData": true,
  "companyData": {
    "user_profile": { /* CMF data */ },
    "companies": [ /* personalized companies */ ]
  },
  "preferences": {
    "watchlist_company_ids": [1, 5, 12],
    "removed_company_ids": [3, 8],
    "view_mode": "explore"
  }
}
```

### POST /api/user/data  
Saves user's state changes to database.

**Request:**
```json
{
  "userId": "user-uuid",
  "userProfile": { /* updated CMF data */ },
  "companies": [ /* updated company list */ ],
  "preferences": {
    "watchlist_company_ids": [1, 5, 12, 15],
    "removed_company_ids": [3, 8],
    "view_mode": "explore"
  }
}
```

## Development Workflows

### Standard Development (Recommended)

```bash
# 1. Use default database-first mode
npm run dev

# 2. Make changes in the UI
# → Changes save to database (tests production flow)
# → If database unavailable, falls back to files

# 3. Monitor logs for persistence confirmation
# → "💾 Successfully saved user data to database"
```

### Rapid Iteration Mode

```bash
# 1. Enable file-only mode
echo "NEXT_PUBLIC_DEV_PERSISTENCE_MODE=file-only" >> .env.local

# 2. Start dev server
npm run dev

# 3. Start file server for automatic updates (optional)
node dev-server.js

# 4. Make changes in UI
# → Changes save directly to companies.ts
# → Fastest iteration cycle
```

### Testing Production Flow

```bash
# 1. Ensure database-first mode (default)
# Remove or comment out DEV_PERSISTENCE_MODE

# 2. Test with real database
npm run dev

# 3. Verify database updates in Supabase dashboard
# → Check user_company_data table
# → Check user_preferences table
```

## Monitoring and Debugging

### Console Logging

The system provides detailed logging for debugging:

```
🔧 Persistence mode: database-first
💾 Successfully saved user data to database
📡 Database save failed, falling back to file system  
💾 File-only mode: Saved to companies.ts
```

### Error Handling

- **Production**: Fails fast if database unavailable
- **Development**: Graceful fallback with clear messaging
- **Always**: localStorage backup for data recovery

## Best Practices

### For Production Deployments

1. **Always use database persistence** (automatic)
2. **Set up proper RLS policies** for security
3. **Monitor database performance** under load
4. **Backup user data regularly**

### For Development

1. **Start with database-first** to test production flow
2. **Switch to file-only** for rapid UI iteration
3. **Use file server** for automatic code updates
4. **Check console logs** for persistence confirmation

### For Team Collaboration

1. **Document environment setup** in project README
2. **Share .env.example** with required variables
3. **Use consistent persistence modes** across team
4. **Test database flow** before production deployments

## Security Considerations

### Production Security
- Service role keys never exposed to client
- RLS policies enforce user data isolation  
- HTTPS required for all database connections

### Development Security  
- Local files contain no sensitive data
- Database credentials in .env.local (gitignored)
- Clear separation between dev and prod data

## Future Enhancements

### Planned Features
- [ ] Real-time sync between multiple user sessions
- [ ] Conflict resolution for concurrent edits
- [ ] Data export/import functionality
- [ ] Advanced caching strategies

### Monitoring
- [ ] Persistence performance metrics
- [ ] Error rate tracking
- [ ] User data consistency checks

---

## Quick Reference

| Environment | Default Mode | Fallback | Configuration |
|-------------|--------------|----------|---------------|
| Production | database-first | ❌ Fail fast | Automatic |
| Development | database-first | ✅ Files | `DEV_PERSISTENCE_MODE` |
| Dev (Rapid) | file-only | ❌ Console | `file-only` |

**🎯 Key Principle**: Production reliability with development flexibility.