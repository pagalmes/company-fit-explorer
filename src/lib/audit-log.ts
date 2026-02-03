import { SupabaseClient } from '@supabase/supabase-js'

export type AuditAction =
  | 'user.delete'
  | 'user.data.import'
  | 'user.data.export'
  | 'user.companies.import'
  | 'user.onboarding.reset'
  | 'user.invitation.create'

export interface AuditLogParams {
  adminClient: SupabaseClient
  action: AuditAction
  adminId: string
  targetUserId: string | null
  details?: Record<string, unknown>
  request?: Request
}

/**
 * Logs an admin action to the audit_logs table.
 *
 * @param params - The audit log parameters
 * @returns void - Errors are logged but don't throw to avoid breaking the main operation
 *
 * @example
 * ```typescript
 * await auditLog({
 *   adminClient,
 *   action: 'user.delete',
 *   adminId: user.id,
 *   targetUserId: deletedUserId,
 *   details: { email: targetUser.email },
 *   request
 * })
 * ```
 */
export async function auditLog({
  adminClient,
  action,
  adminId,
  targetUserId,
  details,
  request
}: AuditLogParams): Promise<void> {
  try {
    const ipAddress = request?.headers.get('x-forwarded-for')?.split(',')[0].trim() || null
    const userAgent = request?.headers.get('user-agent') || null

    const { error } = await adminClient.from('admin_audit_logs').insert({
      action,
      admin_id: adminId,
      target_user_id: targetUserId,
      details: details || {},
      ip_address: ipAddress,
      user_agent: userAgent
    })

    if (error) {
      // Log but don't throw - audit failures shouldn't break operations
      console.error('Failed to write audit log:', error)
    }
  } catch (error) {
    // Log but don't throw - audit failures shouldn't break operations
    console.error('Error writing audit log:', error)
  }
}
