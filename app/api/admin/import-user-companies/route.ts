import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Import companies.ts data for a specific user (admin only)
export async function POST(request: Request) {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Supabase not configured' }, 
      { status: 500 }
    );
  }

  // Use admin client with service role key for database operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const { userId, companiesData } = body

    console.log('📥 Importing companies data for user:', userId)

    if (!userId || !companiesData) {
      return NextResponse.json(
        { error: 'userId and companiesData are required' }, 
        { status: 400 }
      )
    }

    // Validate the companies data structure
    if (!companiesData.userProfile || !companiesData.companies) {
      return NextResponse.json(
        { error: 'Invalid companies data format. Expected userProfile and companies fields.' }, 
        { status: 400 }
      )
    }

    // Check if user exists in profiles table
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      )
    }

    console.log('👤 Found user:', userProfile.email)
    console.log('📊 Importing data:', {
      userProfileName: companiesData.userProfile.name,
      companyCount: companiesData.companies.length,
      hasWatchlist: companiesData.watchlistCompanyIds?.length > 0
    })

    // Upsert user company data
    const { error: dataError } = await supabase
      .from('user_company_data')
      .upsert({
        user_id: userId,
        user_profile: companiesData.userProfile,
        companies: companiesData.companies,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (dataError) {
      console.error('Error importing company data:', dataError)
      return NextResponse.json(
        { error: dataError.message }, 
        { status: 500 }
      )
    }

    // Update user preferences if provided
    const preferences = {
      watchlist_company_ids: companiesData.watchlistCompanyIds || [],
      removed_company_ids: companiesData.removedCompanyIds || [],
      view_mode: companiesData.viewMode || 'explore'
    }

    const { error: prefError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (prefError) {
      console.error('Error importing user preferences:', prefError)
      // Don't fail the entire import for preference errors
      console.warn('Preferences import failed, but company data was imported successfully')
    }

    console.log('✅ Successfully imported companies data for user:', userProfile.email)

    return NextResponse.json({ 
      message: `Successfully imported ${companiesData.companies.length} companies for user ${userProfile.email}`,
      success: true,
      importedData: {
        userProfile: companiesData.userProfile.name,
        companyCount: companiesData.companies.length,
        preferences: preferences
      }
    })

  } catch (error) {
    console.error('Error during companies import:', error)
    return NextResponse.json(
      { error: 'Failed to import companies data' }, 
      { status: 500 }
    )
  }
}