# Cosmos MVP Analytics Tracking Spec

*Simple event logging via PostHog to validate core usage patterns*

---

## Goal

Answer one question: **Are users coming back to use the core loop?**

We're not optimizing yet. We're validating whether people want this.

---

## Implementation

Using **PostHog** with:
- Client-side SDK (`posthog-js`)
- Reverse proxy via Next.js rewrites (avoids ad blockers)
- Server-side tracking for API routes

---

## Events Tracked

| Event | Trigger | Properties | Location |
|-------|---------|------------|----------|
| `waitlist_signup` | User joins waitlist | `email` | `app/api/waitlist/route.ts` |
| `invitation_accepted` | User accepts invite | `invitation_token` | `app/api/invite/[token]/accept/route.ts` |
| `user_first_login` | First login (within 5 min of signup) | - | `src/components/AuthWrapper.tsx` |
| `session_started` | User opens the app | - | `src/components/AuthWrapper.tsx` |
| `onboarding_completed` | First company matches generated | `company_count` | `src/components/AppContainer.tsx` |
| `company_viewed` | User clicks on a company node/card | `company_id`, `company_name` | `src/components/CMFGraphExplorerNew.tsx` |
| `company_added_to_watchlist` | User saves company to watchlist | `company_id` | `src/hooks/useWatchlist.ts` |
| `company_removed_from_watchlist` | User removes from watchlist | `company_id` | `src/hooks/useWatchlist.ts` |
| `company_added_manually` | User adds company (any method) | `company_id`, `company_name`, `method` | `src/components/AddCompanyModal.tsx` |
| `company_removed` | User removes a company | `company_id`, `company_name` | `src/services/ExplorationStateManager.ts` |
| `companies_exported` | User exports their list | `company_count`, `format` | `src/components/ExportModal.tsx` |

### Not Yet Implemented

| Event | Trigger | Properties | Priority |
|-------|---------|------------|----------|
| `pipeline_status_updated` | User changes company status | `company_id`, `old_status`, `new_status` | Medium |

---

## Analytics Helper

```typescript
// src/lib/analytics.ts

import { track } from '../lib/analytics';

// Client-side tracking
track('company_viewed', { company_id: company.id, company_name: company.name });

// Server-side tracking (API routes)
import { trackServerEvent } from '../lib/analytics';
trackServerEvent('waitlist_signup', email, { email });
```

---

## PostHog Configuration

### Environment Variables

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx
```

### Reverse Proxy (next.config.js)

Events are sent to `/ingest` on your domain to bypass ad blockers.

---

## Success Signals (What Good Looks Like)

| Metric | Target | Why |
|--------|--------|-----|
| Activation rate | >70% | Onboarding isn't blocking people |
| Watchlist adoption | >50% | Matches are compelling |
| Pipeline adoption | >30% | Core habit is forming |
| Week 2 retention | >40% | People are coming back |

These are rough targets. With 10-20 users, focus on qualitative patterns, not hitting exact numbers.

---

## Not Included (Add Later)

- `pipeline_status_updated` event
- User properties (role, source, etc.)
- Funnel visualization
- Cohort analysis UI
- Real-time dashboards
- Error tracking