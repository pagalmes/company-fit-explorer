# Troubleshooting

Common issues and solutions for Company Fit Explorer.

## Installation & Setup Issues

### `npm install` Fails

**Problem:** Package installation errors

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still failing, try with legacy peer deps
npm install --legacy-peer-deps
```

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or use different port
PORT=3001 npm run dev
```

## Development Issues

### Automatic Persistence Not Working

**Problem:** Added companies not saving to `companies.ts`

**Solutions:**

1. **Check file server is running:**
   ```bash
   # Use full development mode
   npm run dev:full
   ```

2. **Verify file server output:**
   ```
   🚀 Development file server running on http://localhost:3001
   ```

3. **Check console for save messages:**
   ```
   💾 Automatically saved to companies.ts
   ```

4. **Manual save (if server fails):**
   - Check browser console for manual copy/paste instructions
   - Copy JSON and manually update `src/data/companies.ts`

### LLM Features Not Working

**Problem:** "Add Company" doesn't analyze or shows errors

**Solutions:**

1. **Check API key is configured:**
   ```bash
   # In .env.local
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. **Verify key is valid:**
   - Go to [console.anthropic.com](https://console.anthropic.com/)
   - Check API key status
   - Generate new key if expired

3. **Check backend server (development):**
   ```bash
   # LLM server should be running on port 3002
   npm run dev:llm-server
   ```

4. **Check network requests:**
   - Open browser DevTools → Network tab
   - Look for `/api/llm/anthropic/analyze` requests
   - Check response for error messages

### Companies Not Appearing

**Problem:** Graph is empty or missing companies

**Solutions:**

1. **Clear localStorage:**
   ```javascript
   // In browser console
   localStorage.clear();
   location.reload();
   ```

2. **Check removed companies:**
   - You may have accidentally removed companies
   - Click "+" to restore them

3. **Verify data file:**
   - Check `src/data/companies.ts` has companies
   - Ensure `export const activeUserProfile` is set

## Graph Display Issues

### Graph Not Rendering

**Problem:** White screen or "Loading..." message persists

**Solutions:**

1. **Check browser console for errors**

2. **Verify Cytoscape is loaded:**
   ```javascript
   // In browser console
   typeof cytoscape
   // Should return 'function'
   ```

3. **Clear browser cache:**
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
   - Or clear cache in browser settings

### Companies Overlapping

**Problem:** Company nodes are positioned on top of each other

**Solutions:**

1. **Check angle/distance calculations:**
   - Edit `src/utils/graphDataTransform.ts`
   - Verify positioning algorithm

2. **Adjust spacing:**
   ```typescript
   // In graphDataTransform.ts
   const baseDistance = 150; // Increase for more space
   ```

### Hover Effects Not Working

**Problem:** Connection lines don't appear on hover

**Solutions:**

1. **Check browser performance:**
   - Too many companies can slow down hover effects
   - Try reducing number of companies in view

2. **Verify event listeners:**
   - Check browser console for JavaScript errors
   - Restart development server

## Performance Issues

### Slow Rendering

**Problem:** Graph takes long to render or is laggy

**Solutions:**

1. **Reduce number of companies:**
   - Use watchlist mode to show fewer companies
   - Remove companies you're not interested in

2. **Check for performance regressions:**
   ```bash
   npm run test:performance
   ```

3. **Disable animations temporarily:**
   - Edit graph configuration
   - Set `animate: false` in Cytoscape options

### High Memory Usage

**Problem:** Browser becomes slow or crashes

**Solutions:**

1. **Clear localStorage:**
   ```javascript
   localStorage.clear();
   ```

2. **Check for memory leaks:**
   ```bash
   npm run test:performance
   ```

3. **Restart browser**

## Data Sync Issues

### Watchlist Not Persisting

**Problem:** Saved companies disappear after refresh

**Solutions:**

1. **Check localStorage is enabled:**
   ```javascript
   // In browser console
   typeof Storage !== 'undefined'
   // Should return true
   ```

2. **Verify storage quota:**
   - localStorage has 5-10MB limit
   - Clear old data if needed

3. **Check for private/incognito mode:**
   - localStorage may be disabled
   - Use regular browser window

### Cross-Tab Sync Not Working

**Problem:** Changes in one tab don't reflect in another

**Solutions:**

1. **Manually refresh other tabs**

2. **Check storage event listeners:**
   - Verify no JavaScript errors in console

3. **Clear all tabs' cache:**
   - Close all tabs
   - Clear browser cache
   - Reopen application

## Testing Issues

### Tests Failing

**Problem:** `npm test` shows failures

**Solutions:**

1. **Update snapshots (if visual tests changed):**
   ```bash
   npm run test:e2e -- --update-snapshots
   ```

2. **Check for useEffect dependency issues:**
   ```bash
   npm run test:performance
   ```

3. **Clear test cache:**
   ```bash
   rm -rf node_modules/.vitest
   npm test
   ```

### E2E Tests Timing Out

**Problem:** Playwright tests fail with timeout

**Solutions:**

1. **Increase timeout:**
   ```bash
   # In playwright.config.ts
   timeout: 60000  // 60 seconds
   ```

2. **Run in headed mode to debug:**
   ```bash
   npm run test:e2e:ui
   ```

3. **Check test selectors:**
   - Verify elements exist in UI
   - Update selectors if UI changed

## Supabase Issues

### Authentication Not Working

**Problem:** Can't sign in or sign up

**Solutions:**

1. **Verify Supabase configuration:**
   ```bash
   # Check .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

2. **Check Supabase project status:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Verify project is active
   - Check authentication settings

3. **Clear auth cookies:**
   - Clear browser cookies
   - Try signing in again

### Data Not Syncing

**Problem:** Changes don't save to Supabase

**Solutions:**

1. **Check RLS policies:**
   ```bash
   npm run setup:supabase
   ```

2. **Verify network connection:**
   - Check browser Network tab
   - Look for Supabase API calls

3. **Check Supabase logs:**
   - Dashboard → Logs
   - Look for errors

## Still Having Issues?

1. **Check existing issues:** [GitHub Issues](../../issues)
2. **Create new issue:** Include:
   - Operating system and version
   - Node.js version (`node --version`)
   - Browser and version
   - Steps to reproduce
   - Error messages/screenshots
   - Console output

## See Also

- [Getting Started](GETTING_STARTED.md) - Installation guide
- [Development Guide](DEVELOPMENT.md) - Development workflow
- [Testing Guide](guides/TESTING.md) - Testing documentation
