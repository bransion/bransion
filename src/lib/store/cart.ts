// =====================================================================
// BRANSION — Global cart store (Zustand + localStorage persistence).
// 'use client' because it uses localStorage. Import only from client
// components ('use client' files).
// Every line item carries its own price snapshot (sizePrice + markup)
// so future price changes never rewrite an existing cart.
// =====================================================================
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartLine {
  productId: string;
  size: string;
  qty: number;
  // Display data for the drawer (frozen at add-time):
  name: string;
  brandName: string;
  brandSlug: string;
  imageUrl: string;
  sizePrice: number; // NGN per unit — blank cost for chosen size
  markup: number;    // NGN per unit — creator markup
}

interface CartState {
  items: CartLine[];
  add: (item: Omit<CartLine, 'qty'> & { qty?: number }) => void;
  remove: (productId: string, size: string) => void;
  setQty: (productId: string, size: string, qty: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      add: (item) => {
        const qty = item.qty ?? 1;
        const exists = get().items.find(
          (i) => i.productId === item.productId && i.size === item.size
        );
        if (exists) {
          set({
            items: get().items.map((i) =>
              i.productId === item.productId && i.size === item.size
                ? { ...i, qty: i.qty + qty }
                : i
            ),
          });
        } else {
          set({ items: [...get().items, { ...item, qty }] });
        }
      },

      remove: (productId, size) =>
        set({
          items: get().items.filter(
            (i) => !(i.productId === productId && i.size === size)
          ),
        }),

      setQty: (productId, size, qty) => {
        if (qty <= 0) {
          get().remove(productId, size);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId && i.size === size ? { ...i, qty } : i
          ),
        });
      },

      clear: () => set({ items: [] }),
    }),
    {
      name: 'bransion_cart_v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ── Derived helpers (pure functions, safe to call anywhere) ─────────
export function cartCount(items: CartLine[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export function cartSubtotal(items: CartLine[]): number {
  return items.reduce((sum, i) => sum + (i.sizePrice + i.markup) * i.qty, 0);
}