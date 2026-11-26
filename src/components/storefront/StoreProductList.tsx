'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ProductGrid } from './ProductGrid';
import { Loader2 } from 'lucide-react';
import type { ProductWithRelations } from '@/types/product';

// ── Module-level seed ────────────────────────────────────────────────
// Persists across SPA route changes (module stays alive).
// Resets to null on hard refresh (module reloads) → new shuffle.
let sessionSeed: number | null = null;

function getSessionSeed(): number {
  if (sessionSeed === null) {
    sessionSeed = Math.floor(Math.random() * 2 ** 32);
  }
  return sessionSeed;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PAGE_SIZE = 10;

interface Props {
  products: ProductWithRelations[];
  emptyMessage?: string;
  emptyCta?: { label: string; href: string };
}

export function StoreProductList({
  products,
  emptyMessage,
  emptyCta,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<() => void>(() => {});

  // Shuffle once per session-seed. `useMemo` prevents re-shuffle on
  // every render — only when the products array changes.
  const shuffled = useMemo(() => {
    return seededShuffle(products, getSessionSeed());
  }, [products]);

  const visible = shuffled.slice(0, visibleCount);
  const hasMore = visibleCount < shuffled.length;

  const loadMore = useCallback(() => {
    // Guard: prevent double-trigger while a batch is loading
    if (loadingRef.current) return;
    // Guard: nothing left to load
    if (visibleCount >= shuffled.length) return;

    loadingRef.current = true;
    setLoading(true);

    // 300ms delay so the loader is visible → feels intentional, not janky
    setTimeout(() => {
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, shuffled.length));
      setLoading(false);
      loadingRef.current = false;
    }, 300);
  }, [visibleCount, shuffled.length]);

  // Always keep the ref pointing at the latest loadMore so the
  // observer always calls the fresh closure (avoids stale state bugs).
  loadMoreRef.current = loadMore;

  // ── IntersectionObserver — auto-load on scroll ────────────────────
  useEffect(() => {
    if (!hasMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreRef.current();
        }
      },
      // Start loading 300px BEFORE the sentinel enters view → seamless
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  if (shuffled.length === 0) {
    return (
      <ProductGrid
        products={[]}
        emptyMessage={emptyMessage}
        emptyCta={emptyCta}
      />
    );
  }

  return (
    <div className="space-y-8">
      <ProductGrid products={visible} />

      {/* Sentinel — invisible trigger zone. When it scrolls into view
          (with 300px headroom), the observer fires loadMore(). */}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex justify-center py-8 min-h-[60px]"
        >
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more products…
            </div>
          )}
        </div>
      )}

      {/* End-of-list message */}
      {!hasMore && shuffled.length > PAGE_SIZE && (
        <div className="text-center py-8">
          <p className="text-xs text-muted-foreground">
            You&apos;ve reached the end · {shuffled.length} product
            {shuffled.length === 1 ? '' : 's'} total
          </p>
        </div>
      )}
    </div>
  );
}