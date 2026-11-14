// =====================================================================
// BRANSION — Broadcast composer form.
// Select onValueChange callbacks typed to accept string | null
// (Base UI Select passes null on reset).
// =====================================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendBroadcast } from "@/app/actions/admin-comms";

export function BroadcastForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("info");
  const [target, setTarget] = useState("all");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim())
      return toast.error("Title and body required");

    if (!confirm("Send this broadcast now?")) return;

    setBusy(true);
    const res = await sendBroadcast(title, body, type, target);
    setBusy(false);

    if (res.ok) {
      toast.success(`Broadcast sent to ${res.count} users`);
      setTitle("");
      setBody("");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border bg-card p-6 shadow-sm h-fit"
      >
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Platform Update"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Body</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Message content..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                if (v) setType(v);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Target</Label>
            <Select
              value={target}
              onValueChange={(v) => {
                if (v) setTarget(v);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="tier:basic">Basic Tier</SelectItem>
                <SelectItem value="tier:standard">Standard Tier</SelectItem>
                <SelectItem value="tier:premium">Premium Tier</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Send Broadcast
        </Button>
      </form>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-muted-foreground">Live Preview</Label>
        <div className="rounded-lg border bg-card p-4 shadow-sm flex items-start gap-3">
          <div
            className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
              type === "error"
                ? "bg-destructive"
                : type === "warning"
                  ? "bg-amber-500"
                  : type === "success"
                    ? "bg-green-500"
                    : "bg-blue-500"
            }`}
          />
          <div>
            <h4 className="font-semibold text-sm">
              {title || "Notification Title"}
            </h4>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
              {body || "Notification body text..."}
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">Just now</p>
          </div>
        </div>
      </div>
    </div>
  );
}
