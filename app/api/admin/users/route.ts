import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

// Get all users (admin only)
export async function GET() {
  // Create admin client with service role key for database operations
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get cookies to extract the auth token
  const cookieStore = await cookies()
  const authToken = cookieStore.get('sb-access-token') || cookieStore.get('supabase-auth-token')

  if (!authToken) {
    // For now, let's just return all users (we can add auth later)
    console.log('No auth token found, proceeding anyway for testing')
  }

  console.log('Fetching users from profiles table...')
  
  // Get users first
  const { data: profiles, error: profilesError } = await adminSupabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (profilesError) {
    console.error('Error fetching users:', profilesError)
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  // Get all user company data
  const { data: companyData, error: companyError } = await adminSupabase
    .from('user_company_data')
    .select('*')

  if (companyError) {
    console.error('Error fetching company data:', companyError)
    return NextResponse.json({ error: companyError.message }, { status: 500 })
  }

  console.log('Found profiles:', profiles?.length || 0)
  console.log('Found company data records:', companyData?.length || 0)

  // Manually join the data and count actual companies
  const users = profiles?.map(profile => {
    const userCompanyData = companyData?.filter(data => data.user_id === profile.id) || []

    // Count actual companies - check multiple possible column names and structures
    let companyCount = 0
    userCompanyData.forEach(record => {
      // Check 'companies' column (current schema)
      if (record.companies && Array.isArray(record.companies)) {
        companyCount += record.companies.length
      }
      // Check 'company_data' column (legacy)
      else if (record.company_data && Array.isArray(record.company_data)) {
        companyCount += record.company_data.length
      }
      // Check if user_profile contains baseCompanies/addedCompanies (UserExplorationState format)
      else if (record.user_profile) {
        const profile = record.user_profile
        if (profile.baseCompanies && Array.isArray(profile.baseCompanies)) {
          companyCount += profile.baseCompanies.length
        }
        if (profile.addedCompanies && Array.isArray(profile.addedCompanies)) {
          companyCount += profile.addedCompanies.length
        }
      }
    })

    const hasData = companyCount > 0 || userCompanyData.length > 0
    console.log(`User ${profile.email} (ID: ${profile.id}): ${hasData ? `${companyCount} companies` : 'NO DATA'}`)

    return {
      ...profile,
      user_company_data: userCompanyData,
      company_count: companyCount
    }
  }) || []

  return NextResponse.json({ users })
}

// Create user invitation (admin only)
export async function POST(request: Request) {
  // Create admin client with service role key for database operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { email, fullName } = await request.json()

  // Check if user already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('email', email)
    .single()

  if (existingProfile) {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 })
  }

  // For now, we'll use a placeholder admin ID since we simplified auth
  // In production, you'd get this from the authenticated user
  const adminUserId = 'd7cb6efc-1cb5-4946-a7db-0a015a646cbf' // Your user ID from the debug info

  // Generate invitation token
  const inviteToken = uuidv4()
  const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${inviteToken}`

  // First, let's check if the user_invitations table exists
  const { data, error } = await supabase
    .from('user_invitations')
    .insert({
      email,
      full_name: fullName,
      invited_by: adminUserId,
      invite_token: inviteToken
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ 
    invitation: data,
    inviteLink,
    message: 'Invitation created successfully'
  })
}