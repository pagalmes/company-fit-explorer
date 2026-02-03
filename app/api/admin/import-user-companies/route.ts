import { NextResponse } from 'next/server'
import { verifyAdminAccess, isAdminAuthError } from '../../../../src/lib/admin-auth'
import { auditLog } from '../../../../src/lib/audit-log'

// Import companies.ts data for a specific user (admin only)
export async function POST(request: Request) {
  const auth = await verifyAdminAccess()
  if (isAdminAuthError(auth)) {
    return auth.response
  }

  const { user, adminClient } = auth

  try {
    const body = await request.json()
    const { userId, companiesData } = body

    if (!userId || !companiesData) {
      return NextResponse.json(
        { error: 'userId and companiesData are required' },
        { status: 400 }
      )
    }

    // Validate the companies data structure - support UserExplorationState format
    if (!companiesData.cmf && !companiesData.userProfile) {
      return NextResponse.json(
        { error: 'Invalid companies data format. Expected cmf (UserExplorationState) or userProfile fields.' },
        { status: 400 }
      )
    }

    // Check if user exists in profiles table
    const { data: profileData, error: userError } = await adminClient
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (userError || !profileData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userProfile = profileData as { id: string; email: string }
    console.log(`📥 Admin ${user.email} importing companies for user: ${userProfile.email}`)

    // Support both formats: legacy userProfile/companies and new UserExplorationState
    const isUserExplorationState = companiesData.cmf && (companiesData.baseCompanies || companiesData.addedCompanies);

    if (isUserExplorationState) {
      // Validate UserExplorationState structure
      if (!companiesData.cmf) {
        return NextResponse.json(
          { error: 'Invalid UserExplorationState format. Missing cmf field.' },
          { status: 400 }
        )
      }
    } else {
      // Validate legacy structure
      if (!companiesData.companies) {
        return NextResponse.json(
          { error: 'Invalid legacy format. Missing companies field.' },
          { status: 400 }
        )
      }
    }

    // Process data based on format
    let processedUserProfile, processedCompanies;

    if (isUserExplorationState) {
      console.log('📊 Importing UserExplorationState format:', {
        userName: companiesData.name || companiesData.cmf?.name,
        baseCompanyCount: companiesData.baseCompanies?.length || 0,
        addedCompanyCount: companiesData.addedCompanies?.length || 0,
        hasWatchlist: companiesData.watchlistCompanyIds?.length > 0
      });

      // Preserve the UserExplorationState structure
      processedUserProfile = {
        id: companiesData.id || userId,
        name: companiesData.name || companiesData.cmf?.name || 'User',
        cmf: companiesData.cmf,
        baseCompanies: companiesData.baseCompanies || [],
        addedCompanies: companiesData.addedCompanies || [],
        removedCompanyIds: companiesData.removedCompanyIds || [],
        watchlistCompanyIds: companiesData.watchlistCompanyIds || [],
        lastSelectedCompanyId: companiesData.lastSelectedCompanyId,
        viewMode: companiesData.viewMode || 'explore'
      };

      // Combine baseCompanies + addedCompanies for database storage
      // But preserve the structure in user_profile
      processedCompanies = [
        ...(companiesData.baseCompanies || []),
        ...(companiesData.addedCompanies || [])
      ];

    } else {
      console.log('📊 Importing legacy format:', {
        userProfileName: companiesData.userProfile?.name,
        companyCount: companiesData.companies?.length || 0,
        hasWatchlist: companiesData.watchlistCompanyIds?.length > 0
      });

      // Legacy format - convert to structured format
      processedUserProfile = companiesData.userProfile;
      processedCompanies = companiesData.companies || [];
    }

    // Upsert user company data
    const { error: dataError } = await adminClient
      .from('user_company_data')
      .upsert({
        user_id: userId,
        user_profile: processedUserProfile,
        companies: processedCompanies,
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

    const { error: prefError } = await adminClient
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

    // Update profile_status to 'complete' and set onboarding_completed_at
    // This marks admin-imported users as having completed onboarding
    const { error: profileStatusError } = await adminClient
      .from('profiles')
      .update({
        profile_status: 'complete',
        onboarding_completed_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileStatusError) {
      console.error('Error updating profile status:', profileStatusError)
      // Don't fail the entire import for profile status errors
      console.warn('Profile status update failed, but company data was imported successfully')
    } else {
      console.log('✅ Updated profile_status to complete for user:', userProfile.email)
    }

    console.log('✅ Successfully imported companies data for user:', userProfile.email)

    // Audit log
    await auditLog({
      adminClient,
      action: 'user.companies.import',
      adminId: user.id,
      targetUserId: userId,
      details: {
        email: userProfile.email,
        companyCount: processedCompanies.length,
        format: isUserExplorationState ? 'UserExplorationState' : 'legacy'
      },
      request
    })

    return NextResponse.json({
      message: `Successfully imported ${processedCompanies.length} companies for user ${userProfile.email}`,
      success: true,
      importedData: {
        userProfile: processedUserProfile.name || 'User',
        companyCount: processedCompanies.length,
        baseCompanyCount: isUserExplorationState ? (companiesData.baseCompanies?.length || 0) : null,
        addedCompanyCount: isUserExplorationState ? (companiesData.addedCompanies?.length || 0) : null,
        format: isUserExplorationState ? 'UserExplorationState' : 'legacy',
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
