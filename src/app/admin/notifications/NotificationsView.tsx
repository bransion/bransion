'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Send, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  sendTargetedNotification,
  searchUsersForAdmin,
} from '@/app/actions/admin-users-v3';
import { format } from 'date-fns';

interface Props {
  initialHistory: any[];
  initialUsers: any[];
  initialRecipientId: string | null;
}

export function NotificationsView({
  initialHistory,
  initialUsers,
  initialRecipientId,
}: Props) {
  const [history] = useState(initialHistory);
  const [users, setUsers] = useState(initialUsers);

  const [query, setQuery] = useState('');
  const [recipient, setRecipient] = useState<any>(
    initialRecipientId
      ? initialUsers.find((u) => u.id === initialRecipientId) ?? null
      : null
  );

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('general');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 1) {
        const results = await searchUsersForAdmin(query);
        setUsers(results);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !message) return toast.error('Title and message required');

    if (!recipient) {
      if (
        !confirm(
          'No recipient selected. This will broadcast to ALL users. Continue?'
        )
      )
        return;
    }

    setBusy(true);
    const res = await sendTargetedNotification({
      recipient_id: recipient?.id || null,
      title,
      message,
      notification_type: type,
    });
    setBusy(false);

    if (res.ok) {
      toast.success(
        recipient ? 'Message sent to user' : 'Global broadcast sent'
      );
      setTitle('');
      setMessage('');
      setRecipient(null);
      window.location.reload();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Admin Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Send targeted messages or global broadcasts.
          </p>
        </div>

        <form
          onSubmit={handleSend}
          className="rounded-lg border bg-card p-6 space-y-4 shadow-sm"
        >
          <div className="space-y-2">
            <Label>Recipient</Label>
            {recipient ? (
              <div className="flex items-center justify-between rounded-md border bg-muted px-3 py-2 text-sm">
                <span>
                  To: <strong>{recipient.email}</strong>
                </span>
                <button type="button" onClick={() => setRecipient(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search user to message (or leave empty for broadcast)..."
                  className="pl-9"
                />
                {query.length > 1 && users.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-md z-10 max-h-40 overflow-y-auto">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setRecipient(u);
                          setQuery('');
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      >
                        {u.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!recipient && (
              <p className="text-[11px] text-amber-600">
                Leaving this empty will broadcast to every user in the database.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Platform Maintenance"
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Message content..."
            />
          </div>
          <div className="space-y-2">
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
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="tier_broadcast">Tier Broadcast</SelectItem>
                <SelectItem value="targeted_admin">Targeted Admin</SelectItem>
                <SelectItem value="order_update">Order Update</SelectItem>
                <SelectItem value="payout_alert">Payout Alert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}{' '}
            Send Notification
          </Button>
        </form>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight">Broadcast History</h2>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 px-4 text-left">Title</th>
                <th className="py-3 px-4 text-left">Type</th>
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-right">Reads</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No broadcasts sent yet.
                  </td>
                </tr>
              ) : (
                history.map((h, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 px-4 font-medium">{h.title}</td>
                    <td className="py-3 px-4 capitalize text-xs">
                      {h.type?.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {format(new Date(h.created_at), 'MMM d, HH:mm')}
                    </td>
                    <td className="py-3 px-4 text-right text-xs">
                      {h.read_count} / {h.count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}