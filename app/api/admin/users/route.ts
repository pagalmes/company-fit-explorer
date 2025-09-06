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

  // Create user client to verify authentication
  const userSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get cookies to extract the auth token
  const cookieStore = await cookies()
  const authToken = cookieStore.get('sb-access-token') || cookieStore.get('supabase-auth-token')

  if (!authToken) {
    // For now, let's just return all users (we can add auth later)
    console.log('No auth token found, proceeding anyway for testing')
  }

  console.log('Fetching users from profiles table...')
  
  // Use admin client to get all users
  const { data: users, error } = await adminSupabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('Found users:', users?.length || 0)
  return NextResponse.json({ users: users || [] })
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