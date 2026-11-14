# BRANSION V2 — Print-on-Demand Commerce Platform

A full-stack e-commerce + creator studio built for Nigerian print-on-demand.
Creators upload designs, set their own markup, keep 70% of every sale.
Buyers pay via Paystack. Admin manages everything from one dashboard.

**Brand color:** OBSIDIAN BLACK `#0B0B0F` · Soft dark mode `#151C24` cards
**Auth:** Google-only · One login for buyers, creators, and admin.
**Stack:** Next.js 16 · React 19 · Tailwind v4 · shadcn/ui · Supabase · Paystack · Zod

---

## 1. New V2 Features

### Referral Engine

- Every user gets a unique `BRN-XXXX-YY` code.
- When someone signs up with your code, you earn **10% of their first tier payment**.
- You also earn a **lifetime commission on their sales** (Standard referrers earn 2%, Premium referrers earn 5%).
- **Important:** Lifetime commissions are carved out of Bransion's 30% fee, meaning Bransion nets 28% or 25% respectively. The creator still gets their full 70% untouched.

### Admin Fulfillment Workflow

- Creators upload raw assets (PNG, SVG, PDF) and select a print style.
- Products do **not** go live immediately. They enter `pending_review` status.
- Admins review the raw asset in `/admin/fulfillment`, download it, composite the final image, and upload it to publish the product. Creators cannot change product images after publishing.

### Deletion Rules & Slot Reclamation

- Creators can delete brands and products via a 3-step safety dialog.
- Deleting a brand immediately frees up a brand slot (`total_slots_used` drops).
- Brands or products with existing order history **cannot** be hard-deleted (to preserve financial records). They can only be archived.

---

## 2. Subscription Tiers (V2 Slot Math)

| Tier         | Price (One-Time) | Brands Allowed | Products Per Brand | Monthly Fee |
| ------------ | ---------------- | -------------- | ------------------ | ----------- |
| **Basic**    | ₦5,000           | 1              | 1                  | ₦1,000      |
| **Standard** | ₦20,000          | 5              | 3                  | ₦2,000      |
| **Premium**  | ₦50,000          | Unlimited      | Unlimited          | ₦3,000      |

---

## 3. Environment Setup

Create a `.env.local` file with the following keys:

```env
# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# PAYSTACK
PAYSTACK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...

# APP
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ADMIN_EMAIL=your-admin-email@gmail.com
CRON_SECRET=your-secure-random-string

# SUPPORT
# This number powers the floating WhatsApp widget on the storefront.
# Format: Country code + number, digits only, no plus sign.
NEXT_PUBLIC_WHATSAPP_SUPPORT=2348012345678


---

## V3 Architecture — The Styling Engine

Bransion V3 introduces a parent-child relationship for apparel design, admin fulfillment pipelines, and regional logistics.

### 1. Parent-Child Styling
- **Admin** creates `base_plain_apparel` (e.g., Premium Hoodie) with a base 'M' cost and modifiers for other sizes.
- Admin attaches infinite `sub_children_styles` (e.g., Front Print, Full Back).
- **Creators** pick the Base Apparel → Style → Upload Artwork. They never see the size price grid; they only set a single profit markup on top of the M cost + style cost.

### 2. Fulfillment Loop
- Creator submits product → status is `pending_review`.
- Admin goes to `/admin/fulfillment`, downloads the raw asset, composites it in Photoshop, uploads the final image, and clicks **Publish**.
- Product status flips to `published`, `image_locked = true`, and the creator gets an in-app notification.

### 3. Immutable Image Rule
- Creators **cannot** edit the image after publishing. The DB trigger `protect_published_image` raises an exception, and the UI shows a lock icon.
- Admins **can** edit the image via `/admin/catalog` (which writes to `admin_audit_logs`).

### 4. Admin Tools
- **User Governance:** Manual tier overrides (with justification), role toggles, and direct messaging.
- **Logistics:** Per-LGA delivery fee management, dynamically wired into checkout.
- **Inventory:** Full CRUD over base apparel and sub-styles.

### 5. Database Migration Order
For a fresh setup, run:
1. `schema.sql` (V1)
2. `002_referral_fulfillment_upgrade.sql` (V2)
3. `003_lifetime_split_trigger.sql` (V2 fix)
4. `004_fix_source_fee_amount.sql` (V2 fix)
5. `005_fulfillment.sql` (V2)
6. `20261110000003_styling_engine.sql` (V3)

### 6. Environment Variables
Added in V3:
- `NEXT_PUBLIC_STORAGE_BUCKET_STYLES` (default: `style-previews`)
- `NEXT_PUBLIC_WHATSAPP_SUPPORT` (for the floating widget)
```
