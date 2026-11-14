# Bransion V3 — End-to-End Verification Script

Follow this script every time you deploy a major update. It proves the entire pipeline works from inventory management to buyer checkout to creator payouts.

## Prerequisites

- Two Google accounts (Creator A and Buyer B).
- Admin access to your main account.

## Step 1 — Admin: Create Apparel Inventory

1. Go to `/admin/inventory`.
2. Click **Add Plain Apparel**.
3. Fill in Name: `QA Hoodie`, Category: `hoodie`, Description: `Heavyweight cotton`, Base Price: `10000`.
4. Upload any placeholder image.
5. Check sizes `M` (0) and `XL` (+1000) and `3XL` (+1500). Leave others unchecked.
6. Save.
7. Click **Manage Styles** on the new card.
8. Add Sub-Style: Title `Front Print`, Cost `0`, upload an image. Save.

## Step 2 — Creator A: Setup and Create

1. Sign up as **Creator A**. Upgrade to **Basic** tier.
2. Create a brand: `QA Brand`.
3. Go to `/products/create`.
4. Select `QA Brand` -> `QA Hoodie` -> `Front Print`.
5. Verify Base Cost is `10,000`.
6. Set Markup to `5,000`.
7. Verify Total Retail is `15,000`, Bransion Fee is `1,500` (30% of 5k), Creator Net is `3,500` (70% of 5k).
8. Upload a raw design and set Title to `QA Product`. Submit for Review.

## Step 3 — Admin: Fulfillment

1. Go to `/admin/fulfillment`.
2. You should see `QA Product` in the Pending tab.
3. Click **Download Raw Asset** (verify it opens).
4. Click **Upload Composite Image** and upload any placeholder image.
5. Click **Publish Live**.

## Step 4 — Buyer B: Checkout

1. Sign up as **Buyer B** (or use incognito).
2. Go to `/store` and click `QA Product`.
3. Select size `3XL`.
4. Verify the price changes to `16,500` (10k base + 1.5k size mod + 0 cost + 5k markup).
5. Click **Buy Now**.
6. Fill shipping: State `Lagos`, LGA `Ikeja`.
7. Verify Delivery Fee shows `₦2,000` (from your logistics setup).
8. Pay with test card `4084 0840 8408 4081`.

## Step 5 — Verify Financials (Supabase)

1. Check `orders` table: `total_amount = 18500` (16500 product + 2000 delivery).
2. Check `order_items`: `size_price = 11500` (10k + 1.5k size mod), `markup = 5000`.
3. Check Creator A `wallet_transactions`: `+3500` (70% of 5000).
4. Check Bransion wallet (admin): retained `1500` + `10000` base cost + `2000` delivery.

## Step 6 — Admin: User Management

1. Go to `/admin/users`.
2. Search for Creator A. Click the three dots -> **Override Tier**.
3. Change to `Premium`. Justification: `QA Test`. Save.
4. Verify `profiles.account_tier` is now `premium` in Supabase.
5. Verify `admin_audit_logs` has a `user_tier_override` entry.
6. Click three dots -> **Send Message**. Send "Welcome to Premium".
7. Sign in as Creator A -> Notification bell shows the message.

## Step 7 — Creator A: Edit Permissions

1. Go to `/products` as Creator A.
2. Click **Edit** on `QA Product`.
3. Change the Title to `QA Product V2` and Markup to `10,000`. Save.
4. Verify the storefront price updates to `21,500`.
5. Try to change the Image -> Field is locked (greyed out).
6. Try to change the Base Apparel -> Field is locked.

## Step 8 — Admin: Final Edit

1. Go to `/admin/catalog`.
2. Click **Edit** on `QA Product V2`.
3. Upload a different composite image. Save.
4. Verify `products.final_composite_product_url` changed and `image_locked = true`.

---

## V3 Flow: Parent-Child Styling & Fulfillment
