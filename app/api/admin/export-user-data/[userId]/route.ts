import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Export user data as JSON (admin only)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
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
    console.log('📤 Exporting data for user:', userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Check if user exists in profiles table
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('👤 Found user:', userProfile.email);

    // Fetch user company data
    const { data: companyData, error: companyError } = await supabase
      .from('user_company_data')
      .select('user_profile, companies')
      .eq('user_id', userId)
      .single()

    if (companyError) {
      console.error('Error fetching company data:', companyError);
      return NextResponse.json(
        { error: 'No data found for this user' },
        { status: 404 }
      )
    }

    // Fetch user preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('watchlist_company_ids, removed_company_ids, view_mode')
      .eq('user_id', userId)
      .single()

    if (prefError) {
      console.warn('No preferences found for user, using defaults');
    }

    // Build the export data in UserExplorationState format
    const userProfileData = companyData.user_profile || {};

    // Check if it's already in UserExplorationState format
    const isUserExplorationState = userProfileData.cmf && (userProfileData.baseCompanies || userProfileData.addedCompanies);

    let exportData;

    if (isUserExplorationState) {
      // Already in UserExplorationState format
      exportData = {
        id: userId,
        name: userProfileData.name || userProfile.full_name || userProfile.email,
        cmf: userProfileData.cmf,
        baseCompanies: userProfileData.baseCompanies || [],
        addedCompanies: userProfileData.addedCompanies || [],
        removedCompanyIds: preferences?.removed_company_ids || userProfileData.removedCompanyIds || [],
        watchlistCompanyIds: preferences?.watchlist_company_ids || userProfileData.watchlistCompanyIds || [],
        lastSelectedCompanyId: userProfileData.lastSelectedCompanyId || null,
        viewMode: preferences?.view_mode || userProfileData.viewMode || 'explore'
      };
    } else {
      // Legacy format - convert to UserExplorationState
      const companies = companyData.companies || [];

      exportData = {
        id: userId,
        name: userProfileData.name || userProfile.full_name || userProfile.email,
        cmf: {
          id: userId,
          name: userProfileData.name || userProfile.full_name || userProfile.email,
          mustHaves: userProfileData.mustHaves || [],
          wantToHave: userProfileData.wantToHave || [],
          experience: userProfileData.experience || [],
          targetRole: userProfileData.targetRole || '',
          targetCompanies: userProfileData.targetCompanies || ''
        },
        baseCompanies: companies,
        addedCompanies: [],
        removedCompanyIds: preferences?.removed_company_ids || [],
        watchlistCompanyIds: preferences?.watchlist_company_ids || [],
        lastSelectedCompanyId: null,
        viewMode: preferences?.view_mode || 'explore'
      };
    }

    console.log('✅ Successfully exported data for user:', userProfile.email);

    // Return as downloadable JSON
    const fileName = `${userProfile.email.split('@')[0]}-companies-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });

  } catch (error) {
    console.error('Error during data export:', error);
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    )
  }
}
