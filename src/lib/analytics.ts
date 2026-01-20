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

// Initialize Posthog (call once on app mount)
export function initAnalytics() {
  if (typeof window === 'undefined') return

  // Skip analytics in E2E tests (Playwright sets this)
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Playwright')) {
    return
  }

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY

  if (!key) {
    console.warn('Posthog key not configured')
    return
  }

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
}

// Identify user (call after authentication)
export function identifyUser(userId: string, properties?: { email?: string; [key: string]: unknown }) {
  if (typeof window === 'undefined') return

  posthog.identify(userId, properties)
}

// Reset user identity (call on logout)
export function resetUser() {
  if (typeof window === 'undefined') return

  posthog.reset()
}

// Track custom event
export function track(event: AnalyticsEvent, properties?: AnalyticsProperties) {
  if (typeof window === 'undefined') return

  try {
    posthog.capture(event, properties)
  } catch (error) {
    // Silent failure - analytics should never break the app
    console.error('Analytics error:', error)
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
