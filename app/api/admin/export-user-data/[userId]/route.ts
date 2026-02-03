import { NextResponse } from 'next/server'
import { mergeUserPreferences } from '../../../../../src/utils/userPreferencesMerger'
import { verifyAdminAccess, isAdminAuthError } from '../../../../../src/lib/admin-auth'
import { auditLog } from '../../../../../src/lib/audit-log'

// Export user data as JSON (admin only)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await verifyAdminAccess()
  if (isAdminAuthError(auth)) {
    return auth.response
  }

  const { user, adminClient } = auth
  const { userId } = await params

  try {
    console.log(`📤 Admin ${user.email} exporting data for user: ${userId}`)

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Check if user exists in profiles table
    const { data: profileData, error: userError } = await adminClient
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .single()

    if (userError || !profileData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userProfile = profileData as { id: string; email: string; full_name: string | null }
    console.log('👤 Found user:', userProfile.email)

    // Fetch user company data
    const { data: companyDataResult, error: companyError } = await adminClient
      .from('user_company_data')
      .select('user_profile, companies')
      .eq('user_id', userId)
      .single()

    if (companyError || !companyDataResult) {
      console.error('Error fetching company data:', companyError)
      return NextResponse.json(
        { error: 'No data found for this user' },
        { status: 404 }
      )
    }

    const companyData = companyDataResult as { user_profile: Record<string, unknown>; companies: unknown[] }

    // Fetch user preferences
    const { data: preferencesData, error: prefError } = await adminClient
      .from('user_preferences')
      .select('watchlist_company_ids, removed_company_ids, view_mode')
      .eq('user_id', userId)
      .single()

    if (prefError) {
      console.warn('No preferences found for user, using defaults')
    }

    const preferences = preferencesData as { watchlist_company_ids: number[]; removed_company_ids: number[]; view_mode: 'explore' | 'watchlist' } | null

    // Build the export data in UserExplorationState format
    const userProfileData = companyData.user_profile || {}

    // Check if it's already in UserExplorationState format
    const isUserExplorationState = userProfileData.cmf && (userProfileData.baseCompanies || userProfileData.addedCompanies)

    // Merge preferences using centralized utility
    const mergedPreferences = mergeUserPreferences(userProfileData, preferences)

    let exportData

    if (isUserExplorationState) {
      // Already in UserExplorationState format
      exportData = {
        id: userId,
        name: userProfileData.name || userProfile.full_name || userProfile.email,
        cmf: userProfileData.cmf,
        baseCompanies: userProfileData.baseCompanies || [],
        addedCompanies: userProfileData.addedCompanies || [],
        removedCompanyIds: mergedPreferences.removedCompanyIds,
        watchlistCompanyIds: mergedPreferences.watchlistCompanyIds,
        lastSelectedCompanyId: userProfileData.lastSelectedCompanyId || null,
        viewMode: mergedPreferences.viewMode
      }
    } else {
      // Legacy format - convert to UserExplorationState
      const companies = companyData.companies || []

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
        removedCompanyIds: mergedPreferences.removedCompanyIds,
        watchlistCompanyIds: mergedPreferences.watchlistCompanyIds,
        lastSelectedCompanyId: null,
        viewMode: mergedPreferences.viewMode
      }
    }

    console.log(`✅ Successfully exported data for user: ${userProfile.email}`)

    // Audit log
    await auditLog({
      adminClient,
      action: 'user.data.export',
      adminId: user.id,
      targetUserId: userId,
      details: { email: userProfile.email },
      request
    })

    // Return as downloadable JSON
    const fileName = `${userProfile.email.split('@')[0]}-companies-${new Date().toISOString().split('T')[0]}.json`

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    })

  } catch (error) {
    console.error('Error during data export:', error)
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    )
  }
}
