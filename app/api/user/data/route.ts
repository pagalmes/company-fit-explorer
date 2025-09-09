import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

// Get user's company data and preferences
export async function GET(_request: NextRequest) {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('🔧 Supabase not configured, returning no data (will use defaults)');
    return NextResponse.json({
      hasData: false,
      companyData: null,
      preferences: {
        watchlist_company_ids: [],
        removed_company_ids: [],
        view_mode: 'explore'
      }
    });
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
          // Server components can't set cookies, so we skip this
        },
        remove(_name: string, _options: CookieOptions) {
          // Server components can't remove cookies, so we skip this
        },
      },
    }
  )

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.log('🔐 No authenticated user found, returning unauthenticated status');
    return NextResponse.json({
      authenticated: false,
      hasData: false,
      companyData: null,
      preferences: {
        watchlist_company_ids: [],
        removed_company_ids: [],
        view_mode: 'explore'
      }
    });
  }

  console.log('🔐 Authenticated user found:', user.email);

  try {
    // Get THIS user's company data
    const { data: companyData, error: companyError } = await supabase
      .from('user_company_data')
      .select('*')
      .eq('user_id', user.id)

    if (companyError) {
      console.error('Error fetching company data:', companyError)
      return NextResponse.json({ hasData: false, error: companyError.message }, { status: 500 })
    }

    if (!companyData || companyData.length === 0) {
      return NextResponse.json({
        authenticated: true,
        hasData: false,
        userId: user.id, // Include real Supabase user ID for profile creation
        companyData: null,
        preferences: {
          watchlist_company_ids: [],
          removed_company_ids: [],
          view_mode: 'explore'
        }
      })
    }

    const userData = companyData[0]

    // Get user preferences for this user
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userData.user_id)
      .single()

    const response = {
      authenticated: true,
      hasData: true,
      companyData: userData,
      preferences: preferences || {
        watchlist_company_ids: [],
        removed_company_ids: [],
        view_mode: 'explore'
      }
    }

    console.log('📤 Returning user data response:', {
      authenticated: response.authenticated,
      hasData: response.hasData,
      userId: userData.user_id,
      hasUserProfile: !!userData.user_profile,
      hasCompanies: !!(userData.companies && userData.companies.length > 0)
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ hasData: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

// Save user data and preferences
export async function POST(request: Request) {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('🔧 Supabase not configured, persistence disabled (data will use localStorage)');
    return NextResponse.json({
      message: 'Data saved to localStorage (Supabase not configured)',
      success: true
    });
  }

  // Use admin client to bypass RLS for now
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const { userId, userProfile, companies, preferences } = body

    console.log('💾 Saving user data for user:', userId)

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Update user company data
    if (userProfile && companies) {
      const { error: dataError } = await supabase
        .from('user_company_data')
        .upsert({
          user_id: userId,
          user_profile: userProfile,
          companies: companies,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (dataError) {
        console.error('Error updating company data:', dataError)
        return NextResponse.json({ error: dataError.message }, { status: 500 })
      }
    }

    // Update user preferences
    if (preferences) {
      const { error: prefError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          watchlist_company_ids: preferences.watchlist_company_ids || [],
          removed_company_ids: preferences.removed_company_ids || [],
          view_mode: preferences.view_mode || 'explore',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (prefError) {
        console.error('Error updating preferences:', prefError)
        return NextResponse.json({ error: prefError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      message: 'User data saved successfully',
      success: true
    })

  } catch (error) {
    console.error('Error saving user data:', error)
    return NextResponse.json({ error: 'Failed to save user data' }, { status: 500 })
  }
}