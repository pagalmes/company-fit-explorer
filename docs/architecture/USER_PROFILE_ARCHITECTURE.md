# User Profile Creation Architecture

This document explains the extensible user profile creation system designed to support multiple data sources and future agentic workflows.

## 🏗️ Architecture Overview

The profile creation system is built around the `createProfileForUser()` function in `/src/utils/userProfileCreation.ts`, which provides a pluggable architecture for different profile creation methods.

## 📋 Profile Creation Methods

| Method | Description | Status | Use Case |
|--------|-------------|--------|----------|
| `empty` | Creates empty profile for new users | ✅ Implemented | Default for new users |
| `import` | Uses local companies.ts fallback | ✅ Implemented | Development/testing |
| `agentic` | AI-powered profile generation | 🔄 Future | Production personalization |
| `template` | Predefined profile templates | 🔄 Future | Quick onboarding |

## 🔧 Environment Configuration

### `NEXT_PUBLIC_USE_LOCAL_FALLBACK`

Controls fallback behavior for user profiles:

```bash
# Production (default): New users get empty profiles
NEXT_PUBLIC_USE_LOCAL_FALLBACK=false

# Development: Use companies.ts as fallback for testing
NEXT_PUBLIC_USE_LOCAL_FALLBACK=true
```

## 🚀 Usage Examples

### Basic Usage (Current)

```typescript
// Create empty profile for new user
const profile = await createProfileForUser({
  userId: 'user-123',
  userName: 'John Doe',
  email: 'john@example.com'
}, true);
```

### Future Agentic Workflow Integration

```typescript
// Future: AI-powered profile creation
const profile = await createProfileForUser({
  userId: 'user-123',
  userName: 'John Doe',
  email: 'john@example.com',
  resumeFile: resumeFile,
  cmfFile: cmfFile,
  linkedinProfile: 'https://linkedin.com/in/johndoe'
}, true);
```

## 📊 Data Flow

```
1. New User Logs In
   ↓
2. API returns hasData: false
   ↓
3. AppContainer calls createProfileForUser()
   ↓
4. determineProfileCreationMethod() chooses method
   ↓
5. Profile created using selected method
   ↓
6. User sees appropriate experience (empty or populated)
```

## 🎯 Extension Points

### Adding New Profile Creation Methods

1. Add new method to `ProfileCreationMethod` type
2. Implement case in `createUserProfile()` switch statement
3. Update `determineProfileCreationMethod()` logic
4. Add tests and documentation

### Example: Adding Template Method

```typescript
// In userProfileCreation.ts
case 'template':
  const template = await loadProfileTemplate(context.templateId);
  return applyTemplateToUser(template, context);
```

## 🧪 Testing

### Test Empty Profile Creation
- Visit localhost:3000 in incognito
- Login with new user → should see empty state

### Test Local Fallback
- Set `NEXT_PUBLIC_USE_LOCAL_FALLBACK=true`
- Login with new user → should see Theresa K. demo data

### Test Authenticated Users
- Login with existing user → should see their personalized data

## 🔮 Future Roadmap

1. **Phase 1** ✅: Empty profiles for new users
2. **Phase 2** ✅: Environment-controlled fallback
3. **Phase 3** 🔄: Admin import functionality
4. **Phase 4** 🔄: Agentic workflow integration
5. **Phase 5** 🔄: Template system
6. **Phase 6** 🔄: ML-powered personalization

## 🔍 Troubleshooting

### Issue: New users see demo data
- Check `NEXT_PUBLIC_USE_LOCAL_FALLBACK` is `false` or unset
- Verify API returns `hasData: false` for new users
- Check browser console for profile creation logs

### Issue: Authenticated users lose data
- Check database connection and authentication
- Verify user data exists in `user_company_data` table
- Check API logs for authentication errors

## 📝 Implementation Notes

- The system gracefully falls back to empty profiles on errors
- All profile creation is logged for debugging
- The architecture is designed to be backwards compatible
- Future methods can be added without breaking existing functionality