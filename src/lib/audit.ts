// =====================================================================
// BRANSION — Write entries to admin_audit_log.
// Never re-throws — audit logging must not break the calling operation.
// Supports adminId=null for system events (webhook mismatches, cron errors)
// after the 17a migration made admin_id nullable.
// =====================================================================
import { serviceRoleClient } from '@/lib/supabase/server';

type AdminClient = ReturnType<typeof serviceRoleClient>;

export interface AuditEntry {
  /** Real admin user id, or null for system events. */
  adminId: string | null;
  /** Short snake.case action identifier, e.g. 'webhook.signature_mismatch'. */
  action: string;
  targetTable?: string | null;
  targetId?: string | null;
  meta?: Record<string, unknown> | null;
}

/**
 * Fire-and-forget audit log write. Logs any failure to console but never
 * throws — audit logging must not break the main operation.
 *
 * Caller is responsible for passing a service-role client so the insert
 * bypasses RLS (the audit table has no insert policy for regular users).
 */
export async function writeAuditLog(
  admin: AdminClient,
  entry: AuditEntry
): Promise<void> {
  try {
    const { error } = await admin.from('admin_audit_log').insert({
      admin_id: entry.adminId,
      action: entry.action,
      target_table: entry.targetTable ?? null,
      target_id: entry.targetId ?? null,
      meta: entry.meta ?? null,
    });
    if (error) {
      console.error('[audit] insert error', {
        action: entry.action,
        message: error.message,
      });
    }
  } catch (err) {
    console.error('[audit] write failed', {
      action: entry.action,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}