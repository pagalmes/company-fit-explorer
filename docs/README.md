# Company Fit Explorer Documentation

This directory contains comprehensive documentation for the Company Fit Explorer project, organized by category for easy navigation.

## 🏗️ Architecture

Technical documentation covering the system's design and implementation:

- **[Persistence Architecture](./architecture/PERSISTENCE_ARCHITECTURE.md)** - Database strategies, file fallbacks, and data persistence patterns
- **[User Profile Architecture](./architecture/USER_PROFILE_ARCHITECTURE.md)** - CMF profile management and user state handling  
- **[Agentic Implementation Guide](./architecture/AGENTIC_IMPLEMENTATION_GUIDE.md)** - LLM integration patterns and AI-driven features

## 📖 Guides

Step-by-step guides for development and configuration:

- **[Testing Guide](./guides/TESTING.md)** - Complete testing strategy, unit tests, E2E tests, and coverage reports
- **[LLM Setup](./guides/SETUP_LLM.md)** - Configure AI providers (OpenAI, Anthropic, Google)
- **[LLM Integration](./guides/LLM_INTEGRATION.md)** - Advanced AI features and company analysis
- **[Testing Guide (Detailed)](./guides/TESTING_GUIDE.md)** - Extended testing documentation
- **[Vitest Workarounds](./guides/VITEST_BUG_WORKAROUND.md)** - Solutions for testing environment issues

## 🔐 Security

Security implementation and best practices:

- **[Security Documentation](./security/SECURITY.md)** - RLS policies, authentication hardening, and security audit results

## 📋 Product

Product specifications and feature documentation:

- **[Product Overview](./PRODUCT_OVERVIEW.md)** - Feature specifications, user flows, and product requirements

## 🗂️ Database Documentation

Database setup and configuration (located in `/supabase/`):

- **[RLS Setup](../supabase/RLS_SETUP.md)** - Row-Level Security configuration
- **[Dashboard Security Settings](../supabase/DASHBOARD_SECURITY_SETTINGS.md)** - Supabase dashboard configuration
- **[Supabase Setup](../docs/SUPABASE_SETUP.md)** - Complete database setup guide

## 📝 Quick Navigation

- **Getting Started**: See the main [README.md](../README.md)
- **Development**: [Testing Guide](./guides/TESTING.md) and [Architecture docs](./architecture/)
- **Deployment**: [Security Documentation](./security/SECURITY.md) and [Persistence Architecture](./architecture/PERSISTENCE_ARCHITECTURE.md)
- **AI Features**: [LLM Setup](./guides/SETUP_LLM.md) and [LLM Integration](./guides/LLM_INTEGRATION.md)

---

*This documentation is maintained alongside the codebase. For the latest information, always refer to the files in this directory.*