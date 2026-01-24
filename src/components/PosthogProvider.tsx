'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initAnalytics, posthog, isAnalyticsConfigured } from '../lib/analytics'

export function PosthogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hasLoggedWarning = useRef(false)

  // Initialize Posthog on mount
  useEffect(() => {
    initAnalytics()

    // Log warning once if PostHog is not configured
    if (!isAnalyticsConfigured() && !hasLoggedWarning.current) {
      hasLoggedWarning.current = true
    }
  }, [])

  // Track page views on route change
  useEffect(() => {
    // Only track if PostHog is properly configured
    if (!isAnalyticsConfigured()) return

    try {
      if (pathname && posthog && typeof posthog.capture === 'function') {
        let url = window.origin + pathname
        if (searchParams?.toString()) {
          url = url + '?' + searchParams.toString()
        }
        posthog.capture('$pageview', { $current_url: url })
      }
    } catch {
      // Silent failure - analytics should never break the app
    }
  }, [pathname, searchParams])

  return <>{children}</>
}
