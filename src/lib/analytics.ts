import posthog from 'posthog-js'

// Event types for type safety
export type AnalyticsEvent =
  | 'waitlist_signup'
  | 'invitation_accepted'
  | 'user_first_login'
  | 'session_started'
  | 'onboarding_completed'
  | 'company_viewed'
  | 'company_added_to_watchlist'
  | 'company_removed_from_watchlist'
  | 'company_added_manually'
  | 'company_removed'
  | 'companies_exported'

export interface AnalyticsProperties {
  email?: string
  invitation_token?: string
  company_id?: number | string
  company_name?: string
  company_count?: number
  method?: 'search' | 'paste_text' | 'paste_screenshot' | 'manual'
  format?: 'csv' | 'markdown' | 'json'
  [key: string]: unknown
}

// Track if PostHog has been initialized
let posthogInitialized = false

// Check if PostHog is configured with a valid-looking key
export function isAnalyticsConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  // Must exist and look like a real key (not a placeholder)
  return !!key && key.startsWith('phc_') && key.length > 10 && !key.includes('xxxxx')
}

// Initialize Posthog (call once on app mount)
export function initAnalytics() {
  if (typeof window === 'undefined') return
  if (posthogInitialized) return

  // Skip analytics in E2E tests (Playwright sets this)
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Playwright')) {
    return
  }

  if (!isAnalyticsConfigured()) {
    // Warning logged in PosthogProvider, no need to duplicate here
    return
  }

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY!

  try {
    posthog.init(key, {
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      persistence: 'localStorage',
      loaded: (posthog) => {
        // Debug mode in development
        if (process.env.NODE_ENV === 'development') {
          posthog.debug()
        }
      }
    })
    posthogInitialized = true
  } catch (error) {
    console.error('Failed to initialize PostHog:', error)
  }
}

// Identify user (call after authentication)
export function identifyUser(userId: string, properties?: { email?: string; [key: string]: unknown }) {
  if (typeof window === 'undefined') return
  if (!posthogInitialized) return

  try {
    posthog.identify(userId, properties)
  } catch {
    // Silent failure
  }
}

// Reset user identity (call on logout)
export function resetUser() {
  if (typeof window === 'undefined') return
  if (!posthogInitialized) return

  try {
    posthog.reset()
  } catch {
    // Silent failure
  }
}

// Track custom event
export function track(event: AnalyticsEvent, properties?: AnalyticsProperties) {
  if (typeof window === 'undefined') return
  if (!posthogInitialized) return

  try {
    posthog.capture(event, properties)
  } catch {
    // Silent failure - analytics should never break the app
  }
}

// Server-side tracking (for API routes)
// Note: This is a simple implementation. For production, consider using posthog-node
export async function trackServerEvent(
  event: AnalyticsEvent,
  distinctId: string,
  properties?: AnalyticsProperties
) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

  if (!key) return

  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: {
          ...properties,
          $lib: 'server'
        }
      })
    })
  } catch (error) {
    // Silent failure
    console.error('Server analytics error:', error)
  }
}

// Export posthog instance for advanced usage
export { posthog }
