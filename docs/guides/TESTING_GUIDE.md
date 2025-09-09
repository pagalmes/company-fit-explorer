# User Profile System Testing Guide

This guide helps you test the new extensible user profile creation system.

## 🎯 Testing Scenarios

### 1. **New User Experience (Default)**

**Expected Behavior**: Empty profiles for truly clean slate

**Steps:**
1. Visit `http://localhost:3000` in incognito mode
2. Should redirect to `/login`
3. Create new account via invitation link
4. After login, should see **empty state** (no companies)
5. Complete first-time experience
6. Should have personalized empty profile

**Environment**: `NEXT_PUBLIC_USE_LOCAL_FALLBACK=false` or unset

---

### 2. **Development Fallback Mode**

**Expected Behavior**: Use Theresa K. demo data for testing

**Steps:**
1. Add to `.env.local`: `NEXT_PUBLIC_USE_LOCAL_FALLBACK=true`
2. Restart development server
3. Login with new account
4. Should see **demo data** (Theresa K.'s companies)
5. Console should show: "Using local companies.ts fallback"

**Environment**: `NEXT_PUBLIC_USE_LOCAL_FALLBACK=true`

---

### 3. **Admin Import Functionality**

**Expected Behavior**: Admin can import custom data for users

**Steps:**
1. Access admin panel: `http://localhost:3000/admin`
2. Go to "Import Companies Data" section
3. Select a user from dropdown
4. Upload JSON file with format:
   ```json
   {
     "userProfile": {
       "name": "Test User",
       "targetRole": "Engineer",
       "mustHaves": ["Remote work"],
       "wantToHave": ["Startup culture"],
       "experience": ["React"],
       "targetCompanies": "Tech companies"
     },
     "companies": [
       {
         "id": 1,
         "name": "Test Company",
         "matchScore": 90,
         "industry": "Technology"
       }
     ],
     "watchlistCompanyIds": [],
     "removedCompanyIds": [],
     "viewMode": "explore"
   }
   ```
5. Click "Import Data"
6. Should see success message
7. User should now see imported data when they login

---

### 4. **Authentication Flow**

**Expected Behavior**: Proper auth checks before content

**Steps:**
1. Visit `http://localhost:3000` without login
2. Should redirect to `/login` (not show content)
3. Login with valid account
4. Should see appropriate content based on user state

---

### 5. **Data Isolation**

**Expected Behavior**: Each user sees only their data

**Steps:**
1. Login as User A → See User A's data
2. Logout and login as User B → See User B's data
3. No cross-contamination between users
4. LocalStorage cleared for new users

---

## 🔧 Environment Variables

| Variable | Value | Behavior |
|----------|-------|----------|
| `NEXT_PUBLIC_USE_LOCAL_FALLBACK` | `false` (default) | Empty profiles for new users |
| `NEXT_PUBLIC_USE_LOCAL_FALLBACK` | `true` | Demo data fallback |

## 🐛 Common Issues & Solutions

### Issue: New user sees demo data
- **Check**: Environment variable is `false` or unset
- **Check**: Browser localStorage is being cleared
- **Solution**: Clear browser storage manually

### Issue: Admin import fails
- **Check**: JSON format is correct
- **Check**: User exists in database
- **Check**: Supabase service key is configured

### Issue: Authentication redirect loop
- **Check**: Supabase authentication configuration
- **Check**: API returns correct `authenticated` field

## 📊 Expected Console Logs

### New User (Default Mode)
```
🔐 User authenticated, proceeding with data loading
🔧 Authenticated user with no data - determining profile creation method
🧹 Clearing localStorage for clean new user experience
🔧 Creating user profile using method: empty
```

### Development Mode
```
🔐 User authenticated, proceeding with data loading
🔧 Preserving localStorage (using local fallback mode)
🔧 Using local companies.ts fallback (NEXT_PUBLIC_USE_LOCAL_FALLBACK=true)
🔧 Creating user profile using method: import
```

## 🚀 Future Extension Testing

When agentic workflows are added, test by:

1. **Mock agentic service availability**
2. **Test profile creation method selection**
3. **Verify fallback to empty profiles**
4. **Test error handling**

## ✅ Testing Checklist

- [ ] New users get empty profiles
- [ ] Environment variable controls fallback
- [ ] Admin can import data for users
- [ ] Authentication redirects work
- [ ] Data isolation between users
- [ ] LocalStorage clearing works
- [ ] Error handling is graceful
- [ ] Console logs are informative