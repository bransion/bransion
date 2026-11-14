// =====================================================================
// BRANSION — Admin communications dashboard.
// Uses pre-formatted date strings (no new Date() at render time).
// All imports resolve from verified paths.
// =====================================================================
import { getBroadcastHistory } from "@/app/actions/admin-comms";
import { BroadcastForm } from "@/components/admin/BroadcastForm";

export default async function AdminCommunicationsPage() {
  const history = await getBroadcastHistory();

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Send in-app notifications to creators and buyers.
        </p>
      </div>

      <BroadcastForm />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Broadcast History</h2>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Title</th>
                <th className="py-3 px-4 text-left">Type</th>
                <th className="py-3 px-4 text-right">Recipients</th>
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
                history.map((h) => (
                  <tr key={h.id} className="border-b last:border-0">
                    <td className="py-3 px-4 whitespace-nowrap">
                      {h.formatted_date}
                    </td>
                    <td className="py-3 px-4 font-medium truncate max-w-[200px]">
                      {h.title}
                    </td>
                    <td className="py-3 px-4 capitalize">{h.type}</td>
                    <td className="py-3 px-4 text-right">{h.count}</td>
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
