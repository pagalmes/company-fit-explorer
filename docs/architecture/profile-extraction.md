# Profile Extraction Architecture

This document describes the two-phase architecture used to extract user profiles from uploaded documents and discover matching companies.

## Overview

When a user uploads their resume and career goals during onboarding, we use a two-phase process:

1. **Phase 1: Claude API** - Extract structured profile data (CMF) from documents
2. **Phase 2: Perplexity API** - Discover companies matching the extracted profile

This separation provides better reliability, cost efficiency, and allows each LLM to focus on what it does best.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER ONBOARDING                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  User uploads: Resume (PDF/text) + Career Goals (PDF/text)              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: PROFILE EXTRACTION (Claude Opus 4.5)                          │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  1. Convert files to base64                                              │
│  2. POST /api/llm/anthropic/extract-profile                              │
│  3. Server extracts text from PDFs using `unpdf` library                 │
│  4. Claude extracts structured CMF using structured outputs              │
│  5. Returns validated UserCMF JSON (guaranteed schema compliance)        │
│                                                                          │
│  Output: UserCMF object with:                                            │
│    - mustHaves: CMFItem[] (skills/values user requires)                  │
│    - wantToHave: CMFItem[] (nice-to-haves)                               │
│    - experience: CMFItem[] (user's background)                           │
│    - targetRole: string                                                  │
│    - targetCompanies: string (industry preferences)                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: COMPANY DISCOVERY (Perplexity)                                │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  1. POST /api/llm/perplexity/discover-companies                          │
│  2. Send pre-extracted CMF (not raw documents)                           │
│  3. Perplexity searches the web for matching companies                   │
│  4. Returns companies with match scores and reasoning                    │
│                                                                          │
│  Output: Company[] with:                                                 │
│    - name, description, matchScore                                       │
│    - matchReason (why this company fits)                                 │
│    - industry, size, location                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STORAGE                                                                 │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  Supabase tables:                                                        │
│    - profiles: user info + profile_status ('pending'|'complete'|'error') │
│    - user_company_data: user_profile (CMF) + companies (discovered)      │
│    - user_preferences: watchlist, removed companies, view mode           │
└─────────────────────────────────────────────────────────────────────────┘
```

## CMFItem Format

Each skill/value in the profile uses a dual-format structure:

```typescript
interface CMFItem {
  short: string;    // Brief label for UI display (e.g., "Python")
  detailed: string; // Context for LLM matching (e.g., "5+ years Python, ML/data pipelines")
}
```

Helper functions in `src/types/index.ts`:

- `getCMFDisplayText(item)` - Returns `short` for UI
- `getCMFDetailedText(item)` - Returns `detailed` for matching
- `getCMFCombinedText(item)` - Returns `"Short: Detailed"` for LLM prompts

## Key Files

### API Routes

| Route | Purpose |
|-------|---------|
| `app/api/llm/anthropic/extract-profile/route.ts` | Phase 1: Claude profile extraction |
| `app/api/llm/perplexity/discover-companies/route.ts` | Phase 2: Perplexity company discovery |

### Utilities

| File | Purpose |
|------|---------|
| `src/utils/fileProcessing.ts` | Orchestrates both phases |
| `src/utils/llm/config.ts` | Model selection (Opus 4.5 for extraction) |
| `src/types/index.ts` | CMFItem type and helpers |

## Why Two Phases?

### 1. Separation of Concerns
- **Claude** excels at structured extraction from documents
- **Perplexity** excels at web search and company research

### 2. Cost Efficiency
- PDF text extraction with `unpdf` reduces Claude input tokens significantly
- Pre-extracted CMF sent to Perplexity is much smaller than raw documents

### 3. Reliability
- Claude's structured outputs guarantee valid JSON schema
- If Perplexity fails, we still have the extracted profile
- Fallback to regex extraction if Claude fails

### 4. Debugging
- Easy to inspect extracted CMF before company discovery
- Can re-run company discovery without re-extracting profile

## Model Selection

Task-based model selection in `src/utils/llm/config.ts`:

```typescript
export const TASK_MODELS = {
  PROFILE_EXTRACTION: 'claude-opus-4-5-20250514',  // Best for nuanced extraction
  COMPANY_ANALYSIS: 'claude-sonnet-4-20250514',    // Good balance
  VALIDATION: 'claude-haiku-3-5-20241022',         // Fast, simple tasks
  DEFAULT: 'claude-sonnet-4-20250514'
}
```

## Error Handling

1. **Claude extraction fails** → Falls back to regex extraction
2. **Perplexity fails** → User gets extracted profile, can manually add companies
3. **PDF parsing fails** → Returns error, user can retry with text file

## Onboarding Status

The `profiles.profile_status` column tracks onboarding progress:

| Status | Meaning |
|--------|---------|
| `pending` | User started but hasn't completed onboarding |
| `complete` | User has completed onboarding successfully |
| `error` | An error occurred during onboarding |
| `null` | Legacy user (before this system) or new user |

## Testing

- Unit tests: `npm test`
- E2E tests: `npm run test:e2e`
- Test files for profile extraction: `src/utils/__tests__/fileProcessing.test.ts`
