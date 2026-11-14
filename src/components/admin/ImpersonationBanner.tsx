"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stopImpersonation } from "@/app/actions/admin-users";

export function ImpersonationBanner({
  user,
}: {
  user: { email: string; full_name: string | null };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function handleExit() {
    setLoading(true);
    await stopImpersonation();
    router.push("/admin/users");
    router.refresh();
  }
  return (
    <div className="bg-amber-500 text-black px-4 py-2 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldAlert className="h-4 w-4" />
        <span>
          You are impersonating <strong>{user.full_name || user.email}</strong>.
          Write actions disabled.
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExit}
        disabled={loading}
        className="h-7 text-xs border-black hover:bg-black hover:text-white"
      >
        {loading ? "Exiting…" : "Exit"}
      </Button>
    </div>
  );
}
