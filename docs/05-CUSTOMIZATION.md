# Customization Guide

Learn how to customize your CMF profile, add companies, and modify the application.

## Customizing Your CMF Profile

### Via User Interface (Recommended for Production)

1. Sign in to the application
2. Click your profile icon
3. Edit CMF fields:
   - Must-haves (critical requirements)
   - Want-to-have (preferences)
   - Experience areas
   - Target role
   - Company preferences

### Via Code (Development)

Edit `src/data/companies.ts`:

```typescript
const yourProfile: UserExplorationState = {
  id: "your-id",
  name: "Your Name",
  cmf: {
    id: "your-id",
    name: "Your Name",
    mustHaves: [
      "Your critical requirement #1",
      "Your critical requirement #2"
    ],
    wantToHave: [
      "Nice-to-have preference #1",
      "Nice-to-have preference #2"
    ],
    experience: [
      "Your experience area #1",
      "Your experience area #2"
    ],
    targetRole: "Your desired role",
    targetCompanies: "Your company stage preference"
  },
  baseCompanies: baseCompanies,
  addedCompanies: [],
  removedCompanyIds: [],
  watchlistCompanyIds: [],
  viewMode: 'explore'
};

export const activeUserProfile = yourProfile;
```

## Adding Companies

### Option 1: Use the UI (Recommended)

1. Click the "+" button
2. Enter company name (supports multiple formats):
   - Company name: "Credo AI"
   - Domain: "credo.ai"
   - URL: "https://www.credo.ai"
   - Smart TLD detection for .ai, .io, .co, .app, .dev, .tech
3. AI analyzes company against your CMF (if API key configured)
4. Review and confirm

**In development mode** (`npm run dev:full`), companies auto-save to `companies.ts`

### Option 2: Manual Addition (Advanced)

Add to `baseCompanies` array in `src/data/companies.ts`:

```typescript
{
  id: 20, // Use next available ID
  name: "Company Name",
  logo: "https://logo.clearbit.com/company.com",
  careerUrl: "https://company.com/careers",
  matchScore: 85,
  industry: "Industry",
  stage: "Company Stage",
  location: "Location",
  employees: "Team Size",
  remote: "Remote Policy",
  openRoles: 5,
  connections: [1, 3], // IDs of connected companies
  connectionTypes: {
    1: "AI Competitor",
    3: "Platform Focus"
  },
  matchReasons: [
    "Reason #1 why it matches your CMF",
    "Reason #2 why it matches your CMF"
  ],
  color: "#F59E0B", // Auto-calculated based on score
  angle: 45,        // Auto-calculated
  distance: 130     // Auto-calculated
}
```

## Company Connections

Define relationships between companies using `connections` and `connectionTypes`:

```typescript
connections: [2, 5, 8],  // IDs of related companies
connectionTypes: {
  2: "AI Competitor",
  5: "Similar Culture",
  8: "Platform Focus"
}
```

**Common connection types:**
- `"AI Competitor"` - Similar AI/ML technology
- `"Similar Culture"` - Comparable values/culture
- `"Platform Focus"` - Platform/API strategies
- `"Research Focus"` - Research-oriented
- `"Developer Tools"` - Dev tool builders
- `"Fintech APIs"` - Financial technology

## Styling Customization

### Graph Colors

Edit match score colors in `src/utils/graphDataTransform.ts`:

```typescript
function getColorForScore(score: number): string {
  if (score >= 90) return '#10B981'; // Excellent - emerald
  if (score >= 80) return '#F59E0B'; // Good - amber
  if (score >= 70) return '#F97316'; // Fair - orange
  return '#EF4444';                  // Consider - red
}
```

### CMF Panel

Customize panel appearance in `src/components/CollapsibleCMFPanel.tsx`:
- Background colors
- Border styles
- Collapse/expand animations
- Typography

### Company Detail Panel

Customize sidebar in `src/components/CompanyDetailPanel.tsx`:
- Layout and spacing
- Button styles
- Section organization
- Icon sets

## Match Score Calculation

Customize matching algorithm in `src/utils/companyMatching.ts` (if exists) or via LLM prompts:

```typescript
// Adjust weights for different criteria
const weights = {
  mustHaves: 0.40,      // 40% - Critical requirements
  companyStage: 0.20,   // 20% - Company stage match
  experience: 0.20,     // 20% - Experience relevance
  wantToHave: 0.20      // 20% - Preferences
};
```

## Watchlist Features

### Default View Mode

Change default view in `src/data/companies.ts`:

```typescript
viewMode: 'explore'  // or 'watchlist'
```

### Watchlist Persistence

Customize storage keys in `src/utils/removedCompaniesStorage.ts`:

```typescript
const WATCHLIST_STORAGE_KEY = 'your-custom-key';
```

## Adding External Links

When adding companies, external links are generated automatically:

```typescript
externalLinks: {
  website: "https://company.com",
  linkedin: "https://www.google.com/search?q=Company+on+LinkedIn",
  glassdoor: "https://www.google.com/search?q=Company+on+Glassdoor",
  crunchbase: "https://www.google.com/search?q=Company+on+Crunchbase"
}
```

To customize link generation, edit `app/api/llm/perplexity/search-company-urls/route.ts`

## Advanced Customization

### Company Logo Sources

1. **Logo.dev** (Recommended) - Add `NEXT_PUBLIC_LOGO_DEV_KEY` to `.env.local`
2. **Clearbit** (Free fallback) - `https://logo.clearbit.com/domain.com`
3. **Custom** - Use any image URL

### Graph Layout Algorithm

Customize positioning in `src/utils/graphDataTransform.ts`:

```typescript
// Adjust spacing between companies
const baseDistance = 100;
const distanceMultiplier = 2;

// Modify angle distribution
const angleStep = 360 / companies.length;
```

### CMF Panel Behavior

Customize collapse/expand in `src/utils/panelStorage.ts`:

```typescript
// Change default state
const DEFAULT_COLLAPSED = false;

// Modify persistence
localStorage.setItem(key, JSON.stringify(isCollapsed));
```

## See Also

- [Data Structures](04-DATA_STRUCTURES.md) - Understanding data models
- [Development Guide](03-DEVELOPMENT.md) - Development workflow
- [Testing Guide](guides/TESTING.md) - Testing your changes
