# Cosmos App

A visual career exploration tool that helps you discover companies aligned with your skills, goals, and preferences. See your perfect matches at a glance with an interactive graph showing how companies relate to your Candidate Market Fit (CMF) profile.

> **Want to try it?** [Join the waitlist](https://company-fit-explorer.vercel.app/) for early access.

![Cosmos App](./assets/images/company-fit-explorer-ui.jpg)

## ✨ Features

- 🎯 **CMF-Centered Visualization** - Your profile at the center with companies positioned by match score
- 🔍 **Interactive Company Research** - Click any company to explore detailed information
  - Match reasons, industry, stage, team size, open roles
  - Quick links to LinkedIn, Glassdoor, Crunchbase
  - Find your connections at the company
- 🤖 **AI-Powered Analysis** - Add companies and get intelligent CMF matching (optional)
- 💾 **Smart Persistence** - Watchlist, preferences, and removed companies saved automatically
- 🌐 **Connection Mapping** - Visual relationship network between companies
- 📱 **Responsive Design** - Works beautifully on desktop, tablet, and mobile

## 🚀 Quick Start

```bash
# Clone and install
git clone <repository-url>
cd company-fit-explorer
npm install

# Start the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to explore!

### Optional: Enable AI Features

For AI-powered company analysis, add your Anthropic API key:

```bash
cp .env.example .env.local
# Edit .env.local and add: ANTHROPIC_API_KEY=your-key
```

Get your key at [console.anthropic.com](https://console.anthropic.com/)

## 🏗️ Tech Stack

- **Framework:** Next.js 15 with TypeScript
- **Visualization:** Cytoscape.js for interactive graphs
- **Styling:** Tailwind CSS
- **AI (Optional):** Anthropic Claude for company analysis
- **Testing:** Vitest + Playwright (244 tests with performance regression detection)
- **Database (Optional):** Supabase for multi-user persistence

## 📚 Documentation

### Getting Started
- **[Complete Setup Guide](docs/GETTING_STARTED.md)** - Detailed installation and configuration
- **[Project Structure](docs/guides/PROJECT_STRUCTURE.md)** - Code organization and architecture
- **[Testing Guide](docs/guides/TESTING.md)** - Unit, performance, and E2E tests

### User Guides
- **[Customization Guide](docs/CUSTOMIZATION.md)** - Customize CMF profile and companies
- **[Data Structures](docs/DATA_STRUCTURES.md)** - TypeScript interfaces and data models
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Architecture
- **[Persistence Architecture](docs/architecture/PERSISTENCE_ARCHITECTURE.md)** - Database and storage strategies
- **[LLM Integration](docs/guides/LLM_INTEGRATION.md)** - AI features and setup

### Development
- **[Development Guide](docs/DEVELOPMENT.md)** - TDD workflow and development servers
- **[Contributing Guide](docs/CONTRIBUTING.md)** - How to contribute to the project

## 🧪 Testing

```bash
# Run all tests
npm test

# Performance regression tests (infinite loop detection, API monitoring)
npm run test:performance

# E2E visual regression tests
npm run test:e2e
```

**244 tests** covering unit, integration, performance, and visual regression. See [Testing Guide](docs/guides/TESTING.md) for details.

## 🤝 Contributing

We follow Test-Driven Development. Before contributing:

1. Run existing tests: `npm test`
2. Write tests for new features first
3. Implement features to make tests pass
4. Ensure coverage stays above 85%

See [Contributing Guide](docs/CONTRIBUTING.md) for detailed guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

**Author:** Pierre-Andre Galmes

## 🙏 Acknowledgments

- [Cytoscape.js](https://cytoscape.org/) - Graph visualization
- [Logo.dev](https://logo.dev) - Company logos
- [Anthropic](https://anthropic.com) - AI analysis

---

**Questions?** Open an issue or check our [documentation](docs/).
