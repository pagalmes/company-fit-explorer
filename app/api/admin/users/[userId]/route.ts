import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Delete user (admin only)
export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  
  // Create admin client with service role key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // First, delete user's data from all related tables
    
    // Delete user company data
    await supabase
      .from('user_company_data')
      .delete()
      .eq('user_id', userId)

    // Delete user preferences
    await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userId)

    // Delete user invitations (if they were the inviter)
    await supabase
      .from('user_invitations')
      .delete()
      .eq('invited_by', userId)

    // Delete the user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      return NextResponse.json({ error: 'Failed to delete user profile' }, { status: 500 })
    }

    // Delete the user from auth.users (this requires admin/service role)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Error deleting auth user:', authError)
      return NextResponse.json({ error: 'Failed to delete user authentication' }, { status: 500 })
    }

    return NextResponse.json({ message: 'User deleted successfully' })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}