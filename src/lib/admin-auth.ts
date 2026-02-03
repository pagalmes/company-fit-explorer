import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Using generic SupabaseClient for flexibility with untyped tables
export type AdminAuthResult = {
  user: { id: string; email?: string }
  adminClient: SupabaseClient
}

export type AdminAuthError = {
  response: NextResponse
}

/**
 * Verifies that the current request is from an authenticated admin user.
 *
 * This function:
 * 1. Checks if Supabase is configured
 * 2. Authenticates the user via session cookies
 * 3. Verifies the user has the 'admin' role in the profiles table
 *
 * @returns AdminAuthResult on success (with user and adminClient)
 * @returns AdminAuthError on failure (with pre-built NextResponse)
 *
 * @example
 * ```typescript
 * export async function GET() {
 *   const auth = await verifyAdminAccess()
 *   if (isAdminAuthError(auth)) {
 *     return auth.response
 *   }
 *
 *   const { user, adminClient } = auth
 *   // Proceed with admin operation
 * }
 * ```
 */
export async function verifyAdminAccess(): Promise<AdminAuthResult | AdminAuthError> {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      response: NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }
  }

  const cookieStore = await cookies()

  // Create a Supabase client configured to use cookies for auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(_name: string, _value: string, _options: CookieOptions) {
          // Server components can't set cookies
        },
        remove(_name: string, _options: CookieOptions) {
          // Server components can't remove cookies
        },
      },
    }
  )

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      response: NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
  }

  // Use service role client for database operations
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if current user is admin
  const { data: adminProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || adminProfile?.role !== 'admin') {
    return {
      response: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
  }

  return {
    user: { id: user.id, email: user.email },
    adminClient
  }
}

/**
 * Type guard to check if the result is an auth error
 */
export function isAdminAuthError(result: AdminAuthResult | AdminAuthError): result is AdminAuthError {
  return 'response' in result
}
