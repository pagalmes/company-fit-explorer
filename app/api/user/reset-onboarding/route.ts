import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Reset onboarding for the current authenticated user
 * This clears their company data, preferences, and sets profile_status to 'pending'
 *
 * Usage: POST /api/user/reset-onboarding
 *
 * Typically triggered via URL param: ?reset-onboarding=true
 */
export async function POST() {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 500 }
    )
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
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }

  console.log('🔄 Resetting onboarding for user:', user.email)

  // Use service role client for database operations
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Delete user company data
    const { error: companyDataError } = await adminClient
      .from('user_company_data')
      .delete()
      .eq('user_id', user.id)

    if (companyDataError) {
      console.error('Error deleting company data:', companyDataError)
      // Continue anyway - might not exist
    }

    // Delete user preferences
    const { error: preferencesError } = await adminClient
      .from('user_preferences')
      .delete()
      .eq('user_id', user.id)

    if (preferencesError) {
      console.error('Error deleting preferences:', preferencesError)
      // Continue anyway - might not exist
    }

    // Reset profile_status to 'pending' and clear onboarding_completed_at
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        profile_status: 'pending',
        onboarding_completed_at: null
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error updating profile status:', profileError)
      return NextResponse.json(
        { error: 'Failed to reset profile status' },
        { status: 500 }
      )
    }

    console.log('✅ Successfully reset onboarding for user:', user.email)

    return NextResponse.json({
      success: true,
      message: 'Onboarding reset successfully. You will see the onboarding flow on next page load.'
    })

  } catch (error) {
    console.error('Error during onboarding reset:', error)
    return NextResponse.json(
      { error: 'Failed to reset onboarding' },
      { status: 500 }
    )
  }
}
