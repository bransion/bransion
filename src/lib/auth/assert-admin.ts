// =====================================================================
// BRANSION — Admin Authorization Helper
// =====================================================================
import { createClient, serviceRoleClient } from "@/lib/supabase/server";

export async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in");

  const admin = serviceRoleClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin")
    throw new Error("Forbidden: Admin access required");

  return { userId: user.id, admin };
}
