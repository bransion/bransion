// =====================================================================
// BRANSION — Notification bell (client).
// =====================================================================
"use client";

import { useState, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getMyNotifications,
  markAllNotificationsRead,
} from "@/app/actions/notifications";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  notification_type_v3?: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const data = await getMyNotifications();
    setNotifications(data as Notification[]);
  }

  useEffect(() => {
    load();
    // Subscribe to realtime inserts for live updates.
    const supabase = createClient();
    const channel = supabase
      .channel("public:notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    load();
  }

  async function handleNotificationClick(n: Notification) {
    setOpen(false);

    // Mark single as read in DB
    if (!n.is_read) {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", n.id);
      load();
    }

    // Navigate if link exists
    if (n.link_url) {
      router.push(n.link_url);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          type="button"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-0 text-xs text-muted-foreground"
              onClick={handleMarkAllRead}
            >
              <Check className="mr-1 h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 cursor-pointer",
                  !n.is_read && "bg-muted/50",
                )}
                onClick={() => handleNotificationClick(n)}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="font-medium text-sm">{n.title}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {n.body && (
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {n.body}
                  </span>
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
