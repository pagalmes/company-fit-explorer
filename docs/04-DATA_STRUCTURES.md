# Data Structures

TypeScript interfaces and data models used in Company Fit Explorer.

## Core Interfaces

### UserExplorationState

Complete user exploration data including CMF profile, companies, and preferences.

```typescript
interface UserExplorationState {
  id: string;                          // User identifier
  name: string;                        // User display name
  cmf: UserCMF;                        // Complete CMF profile
  baseCompanies: Company[];            // Original dataset companies
  addedCompanies: Company[];           // User-added companies with LLM analysis
  removedCompanyIds: number[];         // IDs of companies removed by user
  watchlistCompanyIds: number[];       // IDs of companies saved to watchlist
  lastSelectedCompanyId?: number;      // Last selected company for restoration
  viewMode: ViewMode;                  // Current view: 'explore' or 'watchlist'
}
```

### UserCMF

Candidate Market Fit profile representing user's career preferences.

```typescript
interface UserCMF {
  id: string;
  name: string;
  mustHaves: string[];        // Critical requirements
  wantToHave: string[];       // Nice-to-have preferences
  experience: string[];       // Relevant experience areas
  targetRole: string;         // Desired position level
  targetCompanies: string;    // Company stage preference
}
```

### Company

Complete company information including match data and connections.

```typescript
interface Company {
  id: number;
  name: string;
  logo: string;               // Company logo URL
  careerUrl: string;          // Careers page URL for applications
  matchScore: number;         // CMF match percentage (0-100)
  industry: string;           // Company industry
  stage: string;              // Funding/company stage
  location: string;           // Primary location
  employees: string;          // Team size range
  remote: string;             // Remote work policy
  openRoles: number;          // Available positions
  connections: number[];      // Connected company IDs
  connectionTypes: Record<number, string>; // Relationship types
  matchReasons: string[];     // Why this company matches your CMF
  color: string;              // Node color based on match quality
  angle?: number;             // Position angle around CMF center
  distance?: number;          // Distance from center based on match score
  externalLinks?: {           // External research links
    website?: string;         // Company website URL
    linkedin?: string;        // LinkedIn search URL
    glassdoor?: string;       // Glassdoor search URL
    crunchbase?: string;      // Crunchbase search URL
  };
}
```

## Enums and Types

### ViewMode

```typescript
type ViewMode = 'explore' | 'watchlist';
```

- `explore`: Shows all companies except removed ones
- `watchlist`: Shows only saved watchlist companies

### ConnectionTypes

Common relationship types between companies:

- `"AI Competitor"` - Companies in similar AI/ML spaces
- `"Similar Culture"` - Organizations with comparable values
- `"Platform Focus"` - Companies with platform/API strategies
- `"Research Focus"` - Research-oriented organizations
- `"Developer Tools"` - Companies building developer tools
- `"Fintech APIs"` - Financial technology companies

## Match Score Calculation

Match scores (0-100) are calculated based on:

1. **Must-Have Alignment** (40%) - How well company meets critical requirements
2. **Company Stage Match** (20%) - Alignment with target company stage
3. **Experience Relevance** (20%) - Match with user's experience areas
4. **Want-to-Have Preferences** (20%) - Nice-to-have feature alignment

### Score Ranges

- **90-100**: Excellent match (green zone)
- **80-89**: Good match (yellow zone)
- **70-79**: Fair match (orange zone)
- **<70**: Consider carefully (red zone)

## Graph Visualization

### Node Positioning

Companies are positioned using polar coordinates:

```typescript
interface Position {
  angle: number;      // Angle in degrees (0-360)
  distance: number;   // Distance from center (inversely related to score)
}
```

**Distance Calculation:**
```
distance = 100 + (100 - matchScore) * 2
```

Higher match scores → closer to center

### Node Styling

```typescript
interface NodeStyle {
  backgroundColor: string;  // Color based on match score
  width: string;           // Size based on match score
  height: string;          // Size based on match score
  label: string;           // 2-letter company abbreviation
}
```

**Color Scheme:**
- 90-100: `#10B981` (emerald - excellent)
- 80-89: `#F59E0B` (amber - good)
- 70-79: `#F97316` (orange - fair)
- <70: `#EF4444` (red - consider carefully)

## Persistence

### LocalStorage Keys

```typescript
const STORAGE_KEYS = {
  EXPLORATION_STATE: 'cosmos-exploration-state',
  WATCHLIST: 'cosmos-watchlist',
  REMOVED_COMPANIES: 'cosmos-removed-companies',
  PANEL_STATE: 'cosmos-panel-state',
  VISITED: 'cosmos-visited'
};
```

### Storage Format

All localStorage data is JSON serialized:

```typescript
localStorage.setItem(key, JSON.stringify(data));
const data = JSON.parse(localStorage.getItem(key) || 'null');
```

## API Response Types

### LLM Analysis Response

When using AI-powered company analysis:

```typescript
interface LLMAnalysisResponse {
  success: boolean;
  data?: CompanyAnalysisData;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
}

interface CompanyAnalysisData {
  name: string;
  matchScore: number;
  industry: string;
  stage: string;
  location: string;
  employees: string;
  remote: string;
  openRoles: number;
  connections: string[];
  connectionTypes: Record<string, string>;
  matchReasons: string[];
  description: string;
}
```

## Example Data

### Sample UserCMF

```typescript
const exampleCMF: UserCMF = {
  id: "user-123",
  name: "Jane Developer",
  mustHaves: [
    "Work on cutting-edge AI/ML technology",
    "Strong engineering culture with code reviews",
    "Competitive compensation and equity"
  ],
  wantToHave: [
    "Remote-first or hybrid work options",
    "Diverse and inclusive team",
    "Learning and development budget"
  ],
  experience: [
    "5+ years in software engineering",
    "Machine learning and AI projects",
    "Python, TypeScript, React"
  ],
  targetRole: "Senior Software Engineer / ML Engineer",
  targetCompanies: "Series B to Public, AI/ML focused companies"
};
```

### Sample Company

```typescript
const exampleCompany: Company = {
  id: 1,
  name: "Anthropic",
  logo: "https://logo.clearbit.com/anthropic.com",
  careerUrl: "https://www.anthropic.com/careers",
  matchScore: 96,
  industry: "AI/ML",
  stage: "Series C",
  location: "San Francisco, CA",
  employees: "100-500",
  remote: "Remote-friendly",
  openRoles: 25,
  connections: [2, 5, 8],
  connectionTypes: {
    2: "AI Competitor",
    5: "Research Focus",
    8: "Similar Culture"
  },
  matchReasons: [
    "Leading AI safety research aligns with cutting-edge tech interest",
    "Strong engineering culture with rigorous code reviews",
    "Competitive compensation with significant equity",
    "Remote-friendly work environment"
  ],
  color: "#10B981",
  angle: 45,
  distance: 108,
  externalLinks: {
    website: "https://anthropic.com",
    linkedin: "https://www.google.com/search?q=Anthropic+on+LinkedIn",
    glassdoor: "https://www.google.com/search?q=Anthropic+on+Glassdoor",
    crunchbase: "https://www.google.com/search?q=Anthropic+on+Crunchbase"
  }
};
```

## See Also

- [Customization Guide](05-CUSTOMIZATION.md) - How to modify CMF and company data
- [Persistence Architecture](architecture/PERSISTENCE_ARCHITECTURE.md) - Storage strategies
- [LLM Integration](guides/LLM_INTEGRATION.md) - AI analysis details
