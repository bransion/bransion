// =====================================================================
// BRANSION V3 — Admin User Governance Actions
// =====================================================================
"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth/assert-admin";
import {
  tierOverrideSchema,
  targetedNotificationSchema,
} from "@/lib/validations/v3";

export async function searchUsersForAdmin(query: string) {
  const { admin } = await assertAdmin();
  let q = admin
    .from("profiles")
    .select("id, email, full_name, account_tier, tier, role, total_slots_used, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (query && query.trim() !== "") {
    const term = `%${query.trim()}%`;
    q = q.or(
      `email.ilike.${term},full_name.ilike.${term},referral_code.ilike.${term}`,
    );
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function overrideUserTier(input: any) {
  try {
    const { userId, admin } = await assertAdmin();

    const parsed = tierOverrideSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = Object.values(
        parsed.error.flatten().fieldErrors,
      ).flat()[0];
      return { ok: false, error: firstError ?? "Invalid input" };
    }

    const { targetUserId, newTier, justification } = parsed.data;

    const { data: profile } = await admin
      .from("profiles")
      .select("account_tier, tier")
      .eq("id", targetUserId)
      .single();

    if (!profile) return { ok: false, error: "User not found" };

    const oldTier = profile.account_tier ?? profile.tier ?? "basic";

    // Update both columns for backward compatibility
    const { error: updErr } = await admin
      .from("profiles")
      .update({ account_tier: newTier, tier: newTier })
      .eq("id", targetUserId);

    if (updErr) throw updErr;

    // Audit log
    await admin.from("admin_audit_logs").insert({
      admin_id: userId,
      action: "user_tier_override",
      target_table: "profiles",
      target_id: targetUserId,
      previous_state: { tier: oldTier },
      new_state: { tier: newTier },
      justification,
    });

    // Notify user
    await admin.from("notifications").insert({
      recipient_id: targetUserId,
      title: "Account tier updated",
      body: `An admin has updated your account tier to ${newTier}. Reason: ${justification}`,
      type: "info",
      notification_type_v3: "targeted_admin",
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function toggleUserRole(targetUserId: string) {
  try {
    const { userId, admin } = await assertAdmin();
    if (userId === targetUserId)
      return { ok: false, error: "Cannot change your own role" };

    const { data: profile } = await admin
      .from("profiles")
      .select("role, user_role")
      .eq("id", targetUserId)
      .single();

    if (!profile) return { ok: false, error: "User not found" };

    const isCurrentlyAdmin =
      profile.user_role === "admin" || profile.role === "admin";
    const newRole = isCurrentlyAdmin ? "user" : "admin";
    const legacyRole = isCurrentlyAdmin ? "buyer" : "admin";

    const { error } = await admin
      .from("profiles")
      .update({ user_role: newRole, role: legacyRole })
      .eq("id", targetUserId);

    if (error) throw error;

    await admin.from("admin_audit_logs").insert({
      admin_id: userId,
      action: "user_role_change",
      target_table: "profiles",
      target_id: targetUserId,
      previous_state: { role: isCurrentlyAdmin ? "admin" : "user" },
      new_state: { role: newRole },
      justification: "Role toggled via admin dashboard",
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function sendTargetedNotification(input: any) {
  try {
    const { userId, admin } = await assertAdmin();

    const parsed = targetedNotificationSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = Object.values(
        parsed.error.flatten().fieldErrors,
      ).flat()[0];
      return { ok: false, error: firstError ?? "Invalid input" };
    }

    const { recipient_id, title, message, notification_type } = parsed.data;

    if (recipient_id) {
      // Targeted
      await admin.from("notifications").insert({
        recipient_id,
        title,
        body: message,
        type: "info",
        notification_type_v3: notification_type,
      });
    } else {
      // Global Broadcast (Insert one row per user to track read status)
      const { data: users } = await admin.from("profiles").select("id");
      if (users && users.length > 0) {
        const inserts = users.map((u) => ({
          recipient_id: u.id,
          title,
          body: message,
          type: "broadcast",
          notification_type_v3: notification_type,
        }));

        // Chunk inserts if > 1000
        for (let i = 0; i < inserts.length; i += 1000) {
          await admin.from("notifications").insert(inserts.slice(i, i + 1000));
        }
      }
    }

    await admin.from("admin_audit_logs").insert({
      admin_id: userId,
      action: "broadcast_sent",
      target_table: "notifications",
      target_id: recipient_id || null,
      new_state: { title, message, type: notification_type },
      justification: "Sent via Admin Notification Center",
    });

    revalidatePath("/admin/notifications");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function getBroadcastHistory() {
  const { admin } = await assertAdmin();
  // Group by title and body to reconstruct broadcasts
  const { data } = await admin
    .from("notifications")
    .select("id, title, body, notification_type_v3, created_at, is_read")
    .eq("type", "broadcast")
    .order("created_at", { ascending: false })
    .limit(200);

  const grouped = new Map<string, any>();
  for (const n of data || []) {
    const key = `${n.title}-${n.body}-${n.created_at.slice(0, 16)}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        title: n.title,
        body: n.body,
        type: n.notification_type_v3,
        created_at: n.created_at,
        count: 0,
        read_count: 0,
      });
    }
    const g = grouped.get(key);
    g.count++;
    if (n.is_read) g.read_count++;
  }

  return Array.from(grouped.values());
}
