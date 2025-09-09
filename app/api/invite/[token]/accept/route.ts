import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Accept invitation (mark as used)
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Mark invitation as used
    const { data, error } = await supabase
      .from('user_invitations')
      .update({ used: true })
      .eq('invite_token', token)
      .eq('used', false)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Invitation not found or already used' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Invitation accepted successfully' })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
  }
}