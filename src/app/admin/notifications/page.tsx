import { connection } from 'next/server';
import { NotificationsView } from './NotificationsView';
import { getBroadcastHistory, searchUsersForAdmin } from '@/app/actions/admin-users-v3';

interface PageProps {
  searchParams: Promise<{ to?: string }>;
}

export default async function AdminNotificationsPage({ searchParams }: PageProps) {
  await connection();
  const { to } = await searchParams;

  const [history, users] = await Promise.all([
    getBroadcastHistory(),
    searchUsersForAdmin(''),
  ]);

  return (
    <NotificationsView
      initialHistory={history}
      initialUsers={users}
      initialRecipientId={to ?? null}
    />
  );
}