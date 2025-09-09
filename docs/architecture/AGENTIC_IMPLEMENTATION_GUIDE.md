# Agentic Workflow Implementation Guide

This document provides step-by-step instructions for implementing agentic (AI-powered) profile creation in the CMF Explorer system.

## 📋 **Prerequisites**

Before implementing agentic workflows, ensure:
- ✅ User profile creation system is working (current state)
- ✅ Authentication flow is functional
- ✅ Database integration is operational
- ✅ Admin import system is tested

## 🏗️ **Implementation Steps**

### **Step 1: Create Agentic Service**

Create a new service file: `/src/services/AgenticProfileService.ts`

```typescript
import { UserExplorationState, UserCMF, Company } from '../types';
import { ProfileCreationContext } from '../utils/userProfileCreation';

export interface AgenticProfileService {
  isAvailable(): boolean;
  generateProfile(context: ProfileCreationContext): Promise<UserExplorationState>;
}

export class OpenAIProfileService implements AgenticProfileService {
  private apiKey: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
  }

  isAvailable(): boolean {
    return !!this.apiKey && typeof window !== 'undefined';
  }

  async generateProfile(context: ProfileCreationContext): Promise<UserExplorationState> {
    // TODO: Implement your AI logic here
    // This is where you'll integrate with OpenAI, Claude, or your preferred AI service
    
    const userProfile = await this.generateUserCMF(context);
    const companies = await this.generateCompanies(userProfile, context);
    
    return {
      id: context.userId,
      name: context.userName || 'AI Generated User',
      cmf: userProfile,
      baseCompanies: companies,
      addedCompanies: [],
      watchlistCompanyIds: [],
      removedCompanyIds: [],
      viewMode: 'explore'
    };
  }

  private async generateUserCMF(context: ProfileCreationContext): Promise<UserCMF> {
    // Analyze resume/CMF files and generate user profile
    // Example structure - implement with your AI service
    return {
      id: context.userId,
      name: context.userName || 'AI Generated User',
      targetRole: 'Software Engineer', // AI-generated
      mustHaves: ['Remote work', 'Good culture'], // AI-generated
      wantToHave: ['Learning opportunities'], // AI-generated
      experience: ['React', 'TypeScript'], // AI-generated from resume
      targetCompanies: 'Tech startups and growth companies' // AI-generated
    };
  }

  private async generateCompanies(userProfile: UserCMF, context: ProfileCreationContext): Promise<Company[]> {
    // Generate personalized company recommendations
    // This is where your main AI logic will live
    return [
      {
        id: 1,
        name: "AI Recommended Company",
        industry: "Technology",
        matchScore: 95, // AI-calculated match
        // ... other company fields
      }
      // Generate 20-50 companies based on user profile
    ];
  }
}
```

### **Step 2: Update Profile Creation System**

Modify `/src/utils/userProfileCreation.ts`:

```typescript
// Add import at the top
import { OpenAIProfileService } from '../services/AgenticProfileService';

// Initialize agentic service (add after imports)
const agenticService = new OpenAIProfileService();

// Update the determineProfileCreationMethod function
export const determineProfileCreationMethod = (
  context: ProfileCreationContext,
  isNewUser: boolean = true
): ProfileCreationMethod => {
  
  // Check for local fallback environment variable (development override)
  if (process.env.NEXT_PUBLIC_USE_LOCAL_FALLBACK === 'true') {
    console.log('🔧 Using local companies.ts fallback (NEXT_PUBLIC_USE_LOCAL_FALLBACK=true)');
    return 'import';
  }
  
  // NEW: Check if agentic workflow is available and has required data
  if (agenticService.isAvailable() && context.resumeFile && context.cmfFile) {
    console.log('🤖 Using agentic profile generation');
    return 'agentic';
  }
  
  // Default: empty profile for new users
  return 'empty';
};

// Update the createUserProfile function
export const createUserProfile = async (
  method: ProfileCreationMethod,
  context: ProfileCreationContext
): Promise<UserExplorationState> => {
  
  switch (method) {
    case 'empty':
      return createEmptyUserProfile(context.userId, context.userName);
    
    case 'import':
      const { activeUserProfile } = await import('../data/companies');
      return {
        ...activeUserProfile,
        id: context.userId,
        name: context.userName || activeUserProfile.name
      };
    
    case 'agentic':
      // NEW: Use agentic service for AI-powered profile generation
      try {
        console.log('🤖 Generating profile with AI...');
        return await agenticService.generateProfile(context);
      } catch (error) {
        console.error('Agentic profile generation failed:', error);
        // Fallback to empty profile on failure
        return createEmptyUserProfile(context.userId, context.userName);
      }
    
    case 'template':
      throw new Error('Template method not yet implemented');
    
    default:
      return createEmptyUserProfile(context.userId, context.userName);
  }
};
```

### **Step 3: Update First-Time Experience**

Modify `/src/components/DreamyFirstContact.tsx` to pass files to profile creation:

```typescript
// In the handleSubmit function, update the call to onComplete:
const handleSubmit = async () => {
  if (!resumeFile || !cmfFile) return;
  
  // Pass files to the profile creation system
  await onComplete(resumeFile, cmfFile);
};
```

### **Step 4: Update AppContainer**

Modify `/src/components/AppContainer.tsx` to pass files to profile creation:

```typescript
const handleFirstTimeComplete = async (resumeFile: File, cmfFile: File) => {
  setIsLoading(true);
  
  try {
    // Use the extensible profile creation system with file context
    const newUserProfile: UserExplorationState = await createProfileForUser({
      userId: userProfile?.id || 'new-user',
      userName: userProfile?.name || 'New User',
      resumeFile: resumeFile,
      cmfFile: cmfFile
    }, true);
    
    // Save the AI-generated profile to database
    // ... existing save logic
    
  } catch (error) {
    console.error('Profile creation failed:', error);
  } finally {
    setIsLoading(false);
  }
};
```

### **Step 5: Environment Configuration**

Add to `.env.example`:

```bash
# =============================================================================
# AGENTIC PROFILE GENERATION
# =============================================================================
# OpenAI API key for AI-powered profile generation
OPENAI_API_KEY=your-openai-api-key-here

# Or use other AI services
ANTHROPIC_API_KEY=your-claude-api-key-here
```

### **Step 6: Add Loading States**

Update first-time experience with AI-specific loading messages:

```typescript
// In DreamyFirstContact.tsx, add different loading messages:
const [loadingMessage, setLoadingMessage] = useState('');

// During agentic generation:
setLoadingMessage('🤖 AI is analyzing your profile and generating personalized company recommendations...');
```

## 🧪 **Testing Your Implementation**

### **Test Cases**

1. **With Resume + CMF Files**
   - Should use agentic generation
   - Should show AI loading message
   - Should generate personalized companies

2. **Without Required Files**
   - Should fallback to empty profile
   - Should work normally

3. **AI Service Unavailable**
   - Should fallback to empty profile gracefully
   - Should log appropriate error messages

4. **AI Service Errors**
   - Should handle API failures
   - Should fallback without breaking user experience

## 🔧 **Configuration Options**

```typescript
// Create different agentic services for different providers
export class ClaudeProfileService implements AgenticProfileService { /* ... */ }
export class LocalLLMService implements AgenticProfileService { /* ... */ }

// Switch services based on environment
const agenticService = process.env.AI_PROVIDER === 'claude' 
  ? new ClaudeProfileService()
  : new OpenAIProfileService();
```

## 📊 **Expected Flow**

```
1. User uploads resume + CMF files
   ↓
2. System detects agentic service is available
   ↓
3. AI analyzes files and generates:
   - User profile (CMF)
   - Personalized company recommendations
   - Match scores and reasons
   ↓
4. Generated profile saved to database
   ↓
5. User sees personalized experience immediately
```

## 🚨 **Important Notes**

- **Always have fallbacks**: If AI fails, user should still get empty profile
- **Handle rate limits**: Implement retry logic and user feedback
- **Validate AI output**: Ensure generated data matches expected schema
- **Performance**: Consider caching and async processing for large datasets
- **Privacy**: Be mindful of data sent to external AI services
- **Cost management**: Monitor API usage and implement usage limits

## 📝 **Integration Checklist**

- [ ] Create AgenticProfileService with your AI provider
- [ ] Update profile creation method selection
- [ ] Add agentic case to createUserProfile switch
- [ ] Pass files from first-time experience to profile creation
- [ ] Add environment variables for AI service
- [ ] Implement proper error handling and fallbacks
- [ ] Add loading states for AI generation
- [ ] Test all scenarios (success, failure, unavailable)
- [ ] Monitor performance and costs

## 🔮 **Future Enhancements**

- **Incremental updates**: Re-run AI generation periodically
- **User feedback**: Learn from user interactions to improve recommendations
- **Multiple AI providers**: A/B test different AI services
- **Caching**: Cache AI results to reduce costs
- **Background processing**: Generate profiles asynchronously

---

**When you're ready to implement this, just follow these steps and the system will automatically route new users through your agentic workflow!**