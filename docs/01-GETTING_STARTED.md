# Getting Started with Cosmos

Complete setup guide for Cosmos, including all optional features and development tools.

## Prerequisites

- **Node.js** v16 or higher
- **npm** or **yarn**
- **Git**

## Installation

### 1. Clone and Install

```bash
git clone <repository-url>
cd cosmos-app
npm install
```

### 2. Environment Variables

```bash
# Copy environment template
cp .env.example .env.local
```

#### Supabase (Required)

The app requires Supabase for authentication and data persistence:

1. Create a project at [Supabase Dashboard](https://supabase.com/dashboard)
2. Get your credentials:
   - Go to **Project Settings** → **API**
   - Copy the **Project URL**
   - Under **Project API keys**, copy the **anon public** key (starts with `eyJ...`)
   - Copy the **service_role** key (starts with `eyJ...`)

   > **Note:** Use the legacy JWT-based keys (under "Project API keys"), not the new Publishable/Secret keys. The new keys have [compatibility issues](https://github.com/supabase/supabase/issues/39136) with `@supabase/ssr` and RLS policies.
3. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
4. Create database tables: Run the SQL from `supabase/migrations/001_initial_schema.sql` in your Supabase dashboard → SQL Editor

📖 See [02-SUPABASE_SETUP.md](02-SUPABASE_SETUP.md) for complete guide including admin user setup

**Optional Services:**

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

#### PostHog Analytics (Usage Tracking)
For tracking user behavior and product analytics:

- Create account at [PostHog](https://posthog.com) (free tier: 1M events/month)
- Get your project API key from Project Settings → Project API Key
- Add to `.env.local`:
  ```bash
  NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_key
  NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
  ```
- If not configured, analytics are disabled silently (no errors)

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

- **[Customization Guide](05-CUSTOMIZATION.md)** - Customize your CMF profile and companies
- **[Data Structures](04-DATA_STRUCTURES.md)** - Understand the data models
- **[Development Guide](03-DEVELOPMENT.md)** - Set up TDD workflow
- **[Testing Guide](guides/TESTING.md)** - Run tests and add new ones

## Troubleshooting

See [08-TROUBLESHOOTING.md](08-TROUBLESHOOTING.md) for common issues and solutions.

## Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

For deployment, see [06-VERCEL_DEPLOYMENT.md](06-VERCEL_DEPLOYMENT.md).
