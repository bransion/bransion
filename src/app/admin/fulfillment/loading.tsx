import { Skeleton } from '@/components/ui/skeleton';

export default function AdminFulfillmentLoading() {
  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-4 space-y-4 shadow-sm"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>

            {/* Title */}
            <Skeleton className="h-5 w-3/4" />

            {/* Description */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>

            {/* Style thumbnail + meta */}
            <div className="rounded-md border bg-muted/30 p-2 flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-md flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-2 w-12" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>

            {/* Price rows */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24 ml-auto" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16 ml-auto" />
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}