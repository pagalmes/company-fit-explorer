# LLM Pipeline Architecture

This document describes the three-phase architecture used to extract user profiles, discover companies, and generate rich display data.

## Overview

The pipeline uses a three-phase process, with each LLM focused on what it does best:

1. **Phase 1: Claude Opus 4.5** - Extract structured profile data (CMF) from documents
2. **Phase 2: Perplexity Sonar** - Discover company names via real-time web search
3. **Phase 3: Claude Sonnet** - Generate rich display fields (description, match reasoning, etc.)

This separation provides better reliability, cost efficiency, and higher quality outputs.

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
│  Endpoint: POST /api/llm/anthropic/extract-profile                      │
│                                                                          │
│  Purpose: Extract structured CMF from user documents                     │
│                                                                          │
│  Process:                                                                │
│  1. Convert files to base64                                              │
│  2. Server extracts text from PDFs using `unpdf` library                 │
│  3. Claude extracts structured CMF using structured outputs              │
│  4. Returns validated UserCMF JSON (guaranteed schema compliance)        │
│                                                                          │
│  Output: UserCMF object with:                                            │
│    - name: string                                                        │
│    - mustHaves: CMFItem[] (non-negotiable requirements)                  │
│    - wantToHave: CMFItem[] (nice-to-haves)                               │
│    - experience: string[] (skills/background)                            │
│    - targetRole: string                                                  │
│    - targetCompanies: string (industry preferences)                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: COMPANY DISCOVERY (Perplexity Sonar)                          │
│  ─────────────────────────────────────────────────────────────────────  │
│  Endpoint: POST /api/llm/perplexity/discover-companies                  │
│                                                                          │
│  Purpose: Find matching companies via real-time web search               │
│                                                                          │
│  Process:                                                                │
│  1. Receive pre-extracted CMF (not raw documents)                        │
│  2. Search web for companies with open roles matching profile            │
│  3. Verify job postings on career pages, LinkedIn, ATS platforms         │
│  4. Return company names with basic metadata                             │
│                                                                          │
│  Output: Company[] with (web-searchable data only):                      │
│    - name: string (company name)                                         │
│    - careerUrl: string (verified careers page)                           │
│    - industry: string (from web search)                                  │
│    - location: string (headquarters)                                     │
│    - stage: string (funding stage)                                       │
│    - openRoles: number (verified open positions)                         │
│                                                                          │
│  NOTE: Perplexity should NOT generate descriptions or match reasoning.   │
│  These are content generation tasks better suited for Claude.            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: COMPANY ENRICHMENT (Claude Sonnet)                            │
│  ─────────────────────────────────────────────────────────────────────  │
│  Endpoint: POST /api/llm/anthropic/analyze                              │
│                                                                          │
│  Purpose: Generate rich display fields for each company                  │
│                                                                          │
│  Process:                                                                │
│  1. Receive company name + user's CMF criteria                           │
│  2. Claude analyzes company fit against user requirements                │
│  3. Generate human-readable descriptions and reasoning                   │
│                                                                          │
│  Output: Enriched company data with:                                     │
│    - description: string (2-3 sentences about what the company does)     │
│    - matchScore: number (0-100 based on CMF alignment)                   │
│    - matchReasons: string[] (3-4 specific reasons for the score)         │
│    - connections: string[] (similar/related companies)                   │
│    - remote: string (work policy)                                        │
│    - employees: string (company size)                                    │
│    - websiteUrl: string (inferred company domain)                        │
│    - careerUrl: string (if confident)                                    │
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

## Why Three Phases?

### Separation of Concerns

Each LLM is used for what it does best:

| Phase | Model | Strength Used |
|-------|-------|---------------|
| 1. Profile Extraction | Claude Opus 4.5 | Nuanced document understanding, structured extraction |
| 2. Company Discovery | Perplexity Sonar | Real-time web search, fact verification |
| 3. Company Enrichment | Claude Sonnet | Content generation, reasoning, analysis |

### What NOT to Ask Each Model

| Model | Avoid Asking For |
|-------|------------------|
| **Perplexity** | Descriptions, match reasoning, content generation (it's a search engine, not a writer) |
| **Claude** | Real-time company data, job posting verification (no web access) |

### Cost & Quality Benefits

1. **Perplexity** stays focused on search → faster responses, better accuracy
2. **Claude** handles writing → higher quality descriptions and reasoning
3. Each prompt is simpler → fewer errors, easier debugging

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

| Route | Phase | Purpose |
|-------|-------|---------|
| `app/api/llm/anthropic/extract-profile/route.ts` | 1 | Claude profile extraction from documents |
| `app/api/llm/perplexity/discover-companies/route.ts` | 2 | Perplexity web search for companies |
| `app/api/llm/anthropic/analyze/route.ts` | 3 | Claude company enrichment (description, reasoning) |
| `app/api/llm/anthropic/extract-companies/route.ts` | - | Extract company names from pasted text/screenshots |

### Utilities

| File | Purpose |
|------|---------|
| `src/utils/fileProcessing.ts` | Orchestrates phases 1-2 during onboarding |
| `src/utils/llm/config.ts` | Task-based model selection |
| `src/types/index.ts` | CMFItem type and helpers |

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
