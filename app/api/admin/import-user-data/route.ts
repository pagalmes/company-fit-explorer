import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Import user data from JSON (admin only)
export async function POST(request: Request) {
  // Create admin client with service role key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { userId, userData } = await request.json()

    if (!userId || !userData) {
      return NextResponse.json({ error: 'Missing userId or userData' }, { status: 400 })
    }
    
    // userData should contain:
    // - userProfile: UserCMF object
    // - companies: Company[] array

    // Upsert user company data
    const { data, error } = await supabase
      .from('user_company_data')
      .upsert({
        user_id: userId,
        user_profile: userData.userProfile,
        companies: userData.companies,
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      data,
      message: 'User data imported successfully'
    })

  } catch (error) {
    return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
  }
}