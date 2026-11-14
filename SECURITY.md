# BRANSION — Security Posture

This document lists every security defense in the Bransion codebase,
where it's enforced, and how to verify it. Read this before touching
payment or auth code.

**Last audited:** after Sub-batch 17e — all 12 rules PASS.

---

## The 12 Hard Rules

### 1. Never trust client amounts at checkout ✅

**Enforced in:** `src/app/api/orders/checkout/route.ts`

The client sends `{ items: [{ productId, size, qty }] }` — nothing else.
The server re-queries `size_pricing.price` and `products.creator_markup`
from the DB and recomputes `total_amount` itself. If a malicious client
sends `{ totalAmount: 1 }`, it's ignored.

**Verify:** edit a POST body in DevTools to include `total_amount: 1` —
the order is still created with the correct DB-derived amount.

---

### 2. Every API route → 401 if unauthenticated ✅

**Enforced via:** `src/lib/auth-helpers.ts` → `getSessionUser()`

Every POST/PATCH handler starts with:
```ts
const session = await getSessionUser();
if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });