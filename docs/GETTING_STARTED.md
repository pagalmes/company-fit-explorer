# Getting Started with Company Fit Explorer

Complete setup guide for Company Fit Explorer, including all optional features and development tools.

## Prerequisites

- **Node.js** v16 or higher
- **npm** or **yarn**
- **Git**

## Installation

### 1. Clone and Install

```bash
git clone <repository-url>
cd company-fit-explorer
npm install
```

### 2. Environment Variables (Optional)

The app works perfectly without any configuration, but you can enable optional features:

```bash
# Copy environment template
cp .env.example .env.local
```

**Optional Services:**

#### Supabase (Multi-User Persistence)
For user authentication and cloud data persistence:

- Get credentials from [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API
- Add to `.env.local`:
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=your_project_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  ```
- Run automated setup: `npm run setup:supabase`
- 📖 See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for complete guide

#### Anthropic Claude (AI Analysis)
For intelligent company matching and analysis:

- Get API key from [Anthropic Console](https://console.anthropic.com/)
- Add to `.env.local`:
  ```bash
  ANTHROPIC_API_KEY=your_api_key
  ```
- Enables AI-powered company analysis and CMF matching

#### Logo.dev (Company Logos)
For high-quality company logos:

- Get public key from [Logo.dev](https://logo.dev)
- Add to `.env.local`:
  ```bash
  NEXT_PUBLIC_LOGO_DEV_KEY=pk_your_public_key
  ```
- Falls back to Clearbit logos if not configured

## Development Modes

### Quick Start (Recommended for Testing)

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000)

- ✅ Full application functionality
- ✅ localStorage persistence
- ❌ No automatic file writing
- ❌ No LLM server (use backend API key instead)

### Full Development Mode (Recommended for Development)

```bash
npm run dev:full
```

Runs three servers with color-coded output:
- 🔵 **Next.js** (port 3000) - Main application
- 🟢 **File Server** (port 3001) - Auto-saves companies.ts
- 🟡 **LLM Server** (port 3002) - AI analysis endpoints

**Benefits:**
- ✅ Automatic persistence to `src/data/companies.ts`
- ✅ Test LLM features without backend API key
- ✅ Real-time company data updates

### Individual Servers

For debugging or selective features:

```bash
# Terminal 1: React app
npm run dev

# Terminal 2: File persistence
npm run dev:file-server

# Terminal 3: LLM features
npm run dev:llm-server
```

## First-Time Experience

For new users, the app shows a magical onboarding flow:

1. **Cosmic Welcome** - Animated spark with floating stars
2. **Universe Awakening** - Explosion transition
3. **File Upload** - Upload resume and career fit document
4. **Profile Processing** - Files analyzed to customize CMF
5. **Universe Generation** - Cosmic loading before main app

**Test URLs:**
- First-time: `http://localhost:3000/`
- Skip intro: `http://localhost:3000/?skip-intro=true`
- Reset experience: Clear localStorage and revisit

## Verifying Installation

### Test Basic Functionality

1. **Open App**: Navigate to [http://localhost:3000](http://localhost:3000)
2. **See Graph**: Should see your CMF at center with companies around it
3. **Click Company**: Click any company node to see details
4. **Add to Watchlist**: Click "Save to Watchlist" button
5. **Toggle Views**: Switch between "Explore" and "Watchlist" modes

### Test Optional Features

**File Persistence (if dev:full running):**
- Add a company using "+" button
- Check console for "💾 Automatically saved to companies.ts"
- Verify file server shows: "🚀 Development file server running on http://localhost:3001"

**LLM Analysis (if API key configured):**
- Add a company using "+" button
- Should see AI analysis with match score and reasons
- Check for detailed industry, stage, and match breakdown

**Supabase (if configured):**
- Sign up/login should work
- Data persists across devices
- Real-time sync across tabs

## Next Steps

- **[Customization Guide](CUSTOMIZATION.md)** - Customize your CMF profile and companies
- **[Data Structures](DATA_STRUCTURES.md)** - Understand the data models
- **[Development Guide](DEVELOPMENT.md)** - Set up TDD workflow
- **[Testing Guide](guides/TESTING.md)** - Run tests and add new ones

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

## Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

For deployment, see [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md).
