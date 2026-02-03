import { NextResponse } from 'next/server'
import { verifyAdminAccess, isAdminAuthError } from '../../../../../src/lib/admin-auth'
import { auditLog } from '../../../../../src/lib/audit-log'

// Delete user (admin only)
export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await verifyAdminAccess()
  if (isAdminAuthError(auth)) {
    return auth.response
  }

  const { user, adminClient } = auth
  const { userId } = await params

  try {
    // Get target user's email for logging
    const { data: targetUser } = await adminClient
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log(`🗑️ Admin ${user.email} deleting user: ${targetUser.email}`)

    // First, delete user's data from all related tables

    // Delete user company data
    await adminClient
      .from('user_company_data')
      .delete()
      .eq('user_id', userId)

    // Delete user preferences
    await adminClient
      .from('user_preferences')
      .delete()
      .eq('user_id', userId)

    // Delete user invitations (if they were the inviter)
    await adminClient
      .from('user_invitations')
      .delete()
      .eq('invited_by', userId)

    // Delete the user profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      return NextResponse.json({ error: 'Failed to delete user profile' }, { status: 500 })
    }

    // Delete the user from auth.users (this requires admin/service role)
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Error deleting auth user:', authError)
      return NextResponse.json({ error: 'Failed to delete user authentication' }, { status: 500 })
    }

    console.log(`✅ Successfully deleted user: ${targetUser.email}`)

    // Audit log
    await auditLog({
      adminClient,
      action: 'user.delete',
      adminId: user.id,
      targetUserId: userId,
      details: { email: targetUser.email },
      request
    })

    return NextResponse.json({ message: 'User deleted successfully' })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
