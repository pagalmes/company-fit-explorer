# Company Fit Explorer - Interactive CMF Graph Visualization

[![Tests](https://img.shields.io/badge/tests-97%20unit%20%2B%206%20e2e%20passing-brightgreen)](./TESTING.md)
[![Coverage](https://img.shields.io/badge/coverage-85%25-green)](./TESTING.md#coverage-reports)
[![TDD](https://img.shields.io/badge/development-TDD-blue)](./TESTING.md#test-driven-development-workflow)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](./.github/workflows/ci.yml)

An interactive CMF (Candidate Market Fit) visualization tool that helps you discover companies that align with your career goals and preferences. Companies are positioned around your CMF profile based on match scores, with visual indicators for connection strength and match quality.

![Company Graph Explorer](./assets/images/company-fit-explorer-ui.jpg)

## ✨ Features

- **CMF-Centered Graph**: Your Candidate Market Fit profile sits at the center with companies positioned around it based on match scores
- **Collapsible CMF Panel**: Space-saving CMF information panel in the top-left corner:
  - **Click to Collapse/Expand**: Toggle between full details and compact header
  - **Keyboard Accessible**: Full keyboard navigation support (Enter, Space, Escape)
  - **Persistent State**: Remembers your collapse preference across browser sessions
  - **Smooth Animations**: Polished expand/collapse transitions for better UX
  - **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Precise Company Positioning**: Companies arranged in perfect circles around your CMF using exact angle/distance calculations
- **Match Quality Zones**: Visual background zones indicate excellent (90%+), good (80%+), and fair matches
- **Interactive Company Details**: Click any company to see comprehensive information:
  - Match score percentage and detailed match reasons
  - Industry, stage, location, and team size
  - Open roles and remote work policies
  - Connection types to other companies in your network
- **Company Management**: Full control over your company exploration:
  - **Remove Companies**: Clean "Remove Company" button in company details
  - **Smart Restore**: Automatically restores previously removed companies when re-added
  - **Persistent Removal**: Removed companies stay hidden across browser sessions
  - **Watchlist Integration**: Automatically removes companies from watchlist when removed
- **Connection Highlighting**: Hover over companies to see their relationships:
  - 🔵 **AI Competitors** - Companies in similar AI/ML spaces
  - 🟢 **Similar Culture** - Companies with similar values and culture
  - 🟡 **Platform Focus** - Companies with platform/API strategies
  - 🟣 **Research Focus** - Research-oriented organizations
- **Smart Visual Design**: 
  - Company nodes sized and colored by match quality
  - 2-letter abbreviations inside company circles
  - Company names and match percentages displayed below nodes
  - Smooth hover effects and connection highlighting
- **Watchlist Feature**: Save companies you're interested in and track them:
  - **Save Companies**: Click "Save to Watchlist" button with heart icon
  - **View Mode Toggle**: Switch between "Explore Companies" (15) and "Watchlist" (X) views
  - **Heart Indicators**: Subtle heart badges on company logos in the sidebar
  - **Persistent Storage**: Watchlist data saved locally across browser sessions
  - **Statistics Dashboard**: Track total companies, 90%+ matches, and open roles
  - **Empty States**: Elegant prompts when watchlist is empty
  - **Cross-tab Sync**: Real-time updates when watchlist changes in other tabs

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd company-fit-explorer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 🧪 Test-Driven Development

This project uses comprehensive **multi-layer testing** with **97 unit tests + 6 E2E visual tests** covering all core functionality including **edge highlighting regression protection** and **watchlist functionality**, ensuring reliability and preventing regressions across visual interactions.

### Quick Test Commands
```bash
# Unit Tests
npm test              # Watch mode for development
npm run test:run      # CI mode (run once)  
npm run test:coverage # Generate coverage report
npm run test:ui       # Visual test runner interface

# E2E Visual Tests  
npm run test:e2e      # Screenshot-based visual regression tests
npm run test:e2e:ui   # Interactive E2E test runner  
npx playwright show-report tests/reports # View test results and screenshots
```

### TDD Workflow
1. **Write failing test** → 2. **Implement feature** → 3. **Verify test passes** → 4. **Refactor safely**

**Test Coverage:**
- ✅ **104+ tests** across 8 test files
- ✅ **Utility functions** (30 tests) - Data transformations, formatting, validations
- ✅ **Component logic** (36+ tests) - UI interactions, rendering, accessibility  
- ✅ **Integration testing** (15 tests) - End-to-end workflows with real data
- ✅ **Watchlist functionality** (12 tests) - Storage, state management, error handling
- ✅ **Type safety** (10 tests) - Interface validation, data integrity
- ✅ **New features** (20+ tests) - Collapsible CMF panel, keyboard accessibility, company removal

📖 **Complete testing guide:** [TESTING.md](./TESTING.md)

## 🛠️ Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm start` - Alias for `npm run dev`

### Testing
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run all tests once
- `npm run test:coverage` - Generate coverage report
- `npm run test:ui` - Open visual test interface
- `npm run test:e2e` - Run E2E visual regression tests
- `npm run test:e2e:ui` - Interactive E2E test runner
- `npm run test:e2e:headed` - Run E2E tests in headed browser mode
- `npm run docs:tests` - Generate test documentation

## 🏗️ Built With

- **React 18.2** - Frontend framework
- **TypeScript 5.2** - Type safety and development tooling
- **Vite 5.0** - Build tool and dev server
- **Tailwind CSS 3.3** - Utility-first CSS framework
- **Cytoscape.js 3.26** - Graph visualization library
- **Vitest 3.2** - Unit testing framework
- **Playwright 1.54** - E2E testing and visual regression
- **Testing Library** - React component testing utilities

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── CMFGraphExplorer.tsx         # Main CMF graph explorer component
│   ├── CompanyGraph.tsx             # Cytoscape graph visualization
│   ├── CompanyDetailPanel.tsx       # Company details sidebar
│   ├── CollapsibleCMFPanel.tsx      # Collapsible CMF information panel
│   ├── RemoveCompanyModal.tsx       # Company removal confirmation modal
│   ├── AddCompanyModal.tsx          # Add/restore company modal
│   ├── LLMSettingsModal.tsx         # AI settings configuration modal
│   ├── __tests__/                   # Component tests
│   └── index.ts                     # Component exports
├── data/                # Static data and configuration
│   └── companies.ts                 # CMF profile and company dataset
├── hooks/               # Custom React hooks
│   ├── useCompanySelection.ts       # Company selection state hook
│   ├── useWatchlist.ts              # Watchlist state management hook
│   └── index.ts                     # Hook exports
├── styles/              # Styling and CSS
│   └── index.css                    # Global styles and Tailwind imports
├── types/               # TypeScript type definitions
│   ├── index.ts                     # CMF, Company, and graph type definitions
│   ├── watchlist.ts                 # Watchlist interfaces and types
│   └── __tests__/                   # Type validation tests
├── utils/               # Utility functions and configurations
│   ├── graphDataTransform.ts        # Graph positioning and styling logic
│   ├── watchlistStorage.ts          # localStorage utilities with error handling
│   ├── removedCompaniesStorage.ts   # Removed companies persistence utilities
│   ├── panelStorage.ts              # CMF panel state persistence utilities
│   ├── companyStateManager.ts       # Cross-tab company synchronization
│   ├── llm/                         # AI integration utilities
│   ├── index.ts                     # Helper functions
│   └── __tests__/                   # Utility function tests
├── App.tsx              # Root application component
└── main.tsx             # Application entry point
```

## 📊 Data Structure

The application uses structured data for CMF profiles and companies:

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
}

interface WatchlistData {
  userId?: string;            // Optional user identifier for multi-user support
  companyIds: number[];       // Array of saved company IDs
  lastUpdated: string;        // ISO timestamp of last modification
  version: number;            // Data format version for migrations
}
```

## 🎨 Customization

### Updating Your CMF Profile

Edit the `sampleUserCMF` object in `src/data/companies.ts`:

```typescript
const sampleUserCMF: UserCMF = {
  id: "your-id",
  name: "Your Name", 
  mustHaves: [
    "Your critical requirements",
    "Non-negotiable needs"
  ],
  wantToHave: [
    "Nice-to-have preferences",
    "Additional interests"
  ],
  experience: ["Your experience areas"],
  targetRole: "Your desired role level",
  targetCompanies: "Your company stage preference"
};
```

### Adding New Companies

Add companies to the `sampleCompanies` array in `src/data/companies.ts`:

```typescript
{
  id: 16,
  name: "New Company",
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
  connectionTypes: { 1: "Competitor", 3: "Partner" },
  matchReasons: ["Reason why it matches your CMF"],
  color: "#F59E0B", // Color based on match score
  angle: 45,        // Position angle around center
  distance: 100     // Distance from center
}
```

### Customizing Match Score Calculation

Match scores can be enhanced to be dynamic based on:
- Alignment with your must-have requirements
- Geographic location preferences  
- Company culture and values fit
- Role level and compensation expectations
- Industry and technical focus areas

### Using the Watchlist Feature

**Save Companies to Your Watchlist:**
- Click any company node to view details in the sidebar
- Click "Save to Watchlist" button with the heart icon
- The button color changes to red when a company is saved

**Switch Between Views:**
- Use the toggle buttons at the top: "Explore Companies (15)" or "Watchlist (X)"
- Explore mode shows all companies in the dataset
- Watchlist mode filters to show only your saved companies

**Track Your Progress:**
- View watchlist statistics in the sidebar (total companies, excellent matches, open roles)
- Heart indicators appear on company logos in the sidebar for saved companies
- Data persists across browser sessions using localStorage

### Company Management

**Remove Companies:**
- Click any company to view details in the sidebar
- Click the "Remove Company" button at the bottom
- Confirm removal in the modal dialog
- Removed companies are hidden from both explore and watchlist views

**Restore Companies:**
- Use the "+" button to add a company
- If you try to add a previously removed company, it will be automatically restored
- No LLM analysis is needed for restored companies (improves performance)

**Persistent Storage:**
- All removal/restore actions are saved across browser sessions
- Removed companies remain hidden until explicitly restored
- Data is synchronized across multiple browser tabs

### CMF Panel Customization

**Collapse/Expand the CMF Panel:**
- Click anywhere on the CMF panel header to toggle
- Use keyboard shortcuts: Enter, Space (expand/collapse), Escape (collapse only)
- Your preference is automatically saved for future visits
- Provides more screen space for graph visualization when collapsed

### Styling Customization

The application uses Tailwind CSS. Key styling areas:
- `src/styles/index.css` - Global styles and Tailwind imports
- Component classes in the TSX files for layout and colors
- Cytoscape styles in `src/utils/graphDataTransform.ts` for graph visualization

## 🔄 Company Connections

- **AI Competitor**: Companies in similar AI/ML technology spaces
- **Similar Culture**: Organizations with comparable values and work culture
- **Platform Focus**: Companies with platform, API, or infrastructure strategies  
- **Research Focus**: Research-oriented organizations and labs
- **Developer Tools**: Companies building tools and platforms for developers
- **Fintech APIs**: Financial technology and payment processing companies

## ⌨️ Keyboard Shortcuts

The application supports keyboard navigation for accessibility:

### CMF Panel Navigation
- **Enter** or **Space**: Toggle collapse/expand of CMF panel
- **Escape**: Collapse CMF panel (when expanded)
- **Tab**: Navigate between interactive elements

### General Navigation
- **Tab**: Move focus between UI elements
- **Shift + Tab**: Move focus backwards
- **Enter**: Activate buttons and links
- **Escape**: Close modals and dialogs

## 📱 Responsive Design

The application is responsive and works on:
- Desktop computers
- Tablets
- Mobile devices (with optimized touch interactions)

## 🤝 Contributing

We use **Test-Driven Development** to ensure code quality. Please follow these guidelines:

### Before Making Changes
1. **Run existing tests**: `npm test`
2. **Ensure all tests pass** (currently 104+ unit tests across 8 files)
3. **Check coverage doesn't decrease**: `npm run test:coverage`
4. **Run E2E tests**: `npm run test:e2e` (may need visual baseline updates)

### Adding New Features (TDD Approach)
1. **Write test first** describing the expected behavior
2. **Run test** to confirm it fails (red phase)
3. **Implement feature** to make test pass (green phase)
4. **Refactor code** while keeping tests green
5. **Ensure coverage stays above 85%**

### Pull Request Process
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. **Write tests for new functionality**
4. Implement features following TDD workflow
5. **Verify all tests pass**: `npm run test:run`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Test Categories to Consider
- **Unit Tests**: Individual functions and utilities
- **Component Tests**: UI interactions and rendering  
- **Integration Tests**: End-to-end user workflows
- **Data Validation**: Real dataset integrity checks

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Author:** Pierre-Andre Galmes

## 🙏 Acknowledgments

- [Cytoscape.js](https://cytoscape.org/) for the excellent graph visualization library
- [Clearbit](https://clearbit.com/) for company logos
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework

## 📞 Support

If you have questions or need help:
1. Check the Issues page on your repository
2. Create a new issue if your question isn't already addressed
3. Provide as much detail as possible for faster resolution

---

**Happy company exploring! 🎯**