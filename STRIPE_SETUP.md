# Stripe Billing Integration - Setup Complete ✅

## What Was Built

### 1. Database Schema (`supabase/migrations/20260117_add_subscription_fields.sql`)
Added subscription fields to the `users` table:
- `stripe_customer_id` - Links to Stripe customer
- `stripe_subscription_id` - Links to Stripe subscription
- `subscription_status` - Status: `trialing`, `active`, `canceled`, `past_due`
- `trial_ends_at` - 14 days from signup
- `cases_remaining` - Cases left this billing period (50 included)
- `cases_used_this_period` - Cases used this month
- `seats_count` - Number of seats (3 included)
- `billing_period_start/end` - Billing cycle dates
- Auto-reset trigger for monthly cases counter

### 2. Stripe API Routes

**Checkout (`/api/stripe/create-checkout`)**
- Creates Stripe Checkout session
- 14-day free trial
- $149/month Professional plan
- Redirects to Stripe hosted checkout

**Billing Portal (`/api/stripe/create-portal`)**
- Opens Stripe customer portal
- Allows users to manage subscription, update payment, cancel

**Webhooks (`/api/webhooks/stripe`)**
- Handles subscription lifecycle events
- Auto-updates database on subscription changes
- Resets cases counter on billing renewal
- Handles payment success/failure

### 3. Signup Flow

**New Flow:**
1. User signs up → `/signup`
2. Account created → Redirect to `/checkout`
3. Checkout page → Shows pricing, trial info
4. User enters credit card → Stripe Checkout
5. Trial starts → Redirect to `/dashboard`

**Old Flow (removed):**
~~Sign up → Dashboard (no payment)~~

### 4. Subscription Checks

**Case Creation Protection:**
- Checks if user has active subscription or trial
- Verifies cases remaining > 0
- Blocks creation if trial ended or subscription canceled
- Decrements cases counter on successful creation

### 5. Dashboard UI

**Subscription Banner:**
- **Trialing**: Shows days left, cases remaining
- **Active**: Shows usage bar, cases remaining, billing date
- **Canceled/Past Due**: Shows upgrade prompt
- **Manage Billing** button → Opens Stripe portal

### 6. Landing Page Updates

**Changed Copy:**
- ❌ "No credit card required"
- ✅ "14-day free trial"
- ✅ "Cancel anytime"

---

## Setup Instructions

### Step 1: Run Database Migration

Go to your Supabase SQL Editor:
https://mwmiglyufccnvlobtkhi.supabase.co/project/_/sql

Copy and paste the contents of:
```
supabase/migrations/20260117_add_subscription_fields.sql
```

Click **Run** to create the subscription fields.

### Step 2: Configure Stripe Webhook (CRITICAL)

1. Go to Stripe Dashboard → Developers → Webhooks
   https://dashboard.stripe.com/webhooks

2. Click **Add endpoint**

3. **Endpoint URL:**
   ```
   https://useluma.io/api/webhooks/stripe
   ```

4. **Select events to listen to:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. **Copy the webhook signing secret** (starts with `whsec_...`)

6. **Copy the webhook signing secret** (starts with `whsec_...`)
   - Add this to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`
   - ⚠️ Never commit this secret to Git

### Step 3: Verify Stripe Product Configuration

Your Stripe product should already be configured:

- **Product Name**: Luma Professional
- **Price**: $149/month recurring
- **Trial**: 14 days
- **Price ID**: `price_1Sq1ncJfspoIrEoRKmvuvbb2` ✅

### Step 4: Test the Flow

#### Test Signup → Checkout
1. Go to http://useluma.io/signup
2. Create a test account
3. Should redirect to `/checkout` page
4. Click "Start 14-Day Free Trial"
5. Should open Stripe Checkout

#### Test Payment (Use Stripe Test Cards)
**Success:**
- Card: `4242 4242 4242 4242`
- Any future expiry date
- Any CVC

**Payment Fails:**
- Card: `4000 0000 0000 0341`

#### Test Dashboard
1. Complete checkout
2. Should redirect to `/dashboard`
3. Should see "Free Trial Active" banner
4. Should show "X days left" and cases remaining

#### Test Case Creation
1. Click "New Case"
2. Fill out form
3. Submit
4. Should decrement cases remaining
5. Check dashboard → Cases remaining should decrease

#### Test Billing Portal
1. Go to dashboard
2. Click "Manage Billing"
3. Should open Stripe customer portal
4. Can update payment, cancel subscription

---

## Stripe Dashboard Checklist

### ✅ Products
- [x] Professional Plan: $149/month
- [x] 14-day free trial enabled
- [x] Price ID in `.env.local`

### ✅ Webhooks
- [ ] **TODO**: Add webhook endpoint for production
- [ ] Events: subscription created/updated/deleted, invoice paid/failed

### ✅ Customer Portal
- [x] Enabled in Stripe Dashboard
- [x] Allows cancellation
- [x] Allows payment method updates

---

## Testing Scenarios

### Scenario 1: New User Trial
1. Sign up → Checkout → Enter card → Dashboard
2. **Expected**: Trial active, 50 cases, 14 days
3. Create 5 cases
4. **Expected**: 45 cases remaining

### Scenario 2: Trial Expires
1. Wait 14 days (or manually set `trial_ends_at` in DB to past date)
2. Try to create case
3. **Expected**: Error "Trial has ended. Please subscribe."
4. Dashboard shows "Trial Ended" banner with Subscribe button

### Scenario 3: Active Subscription
1. Trial expires → Auto-charge $149
2. **Expected**: Subscription status = `active`
3. Cases reset to 50 on billing renewal
4. Dashboard shows "Professional Plan" active banner

### Scenario 4: Payment Fails
1. Update payment method to failing card
2. Wait for billing renewal
3. **Expected**: Subscription status = `past_due`
4. Dashboard shows "Payment Failed" banner

### Scenario 5: User Cancels
1. Click "Manage Billing"
2. Cancel subscription
3. **Expected**: Subscription status = `canceled`
4. Can still use until period end
5. After period end, cases_remaining = 0

---

## Webhook Testing (Local Development)

Use Stripe CLI to test webhooks locally:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

---

## Environment Variables (Configure in Vercel)

⚠️ **SECURITY WARNING**: Never commit real API keys to Git. Add these to Vercel Dashboard → Settings → Environment Variables.

```bash
# Stripe (SECRET - Add to Vercel, never commit)
STRIPE_SECRET_KEY=sk_live_xxxxx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx...
STRIPE_WEBHOOK_SECRET=whsec_xxxxx...

# Stripe Price IDs (Public, but still add to Vercel)
NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL=price_xxxxx...
NEXT_PUBLIC_STRIPE_PRICE_ID_EXTRA_SEAT=price_xxxxx...
NEXT_PUBLIC_STRIPE_PRICE_ID_EXTRA_CASES=price_xxxxx...

# Supabase (SECRET - Add to Vercel, never commit)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important**: 
- Get your actual keys from Stripe Dashboard → Developers → API keys
- Get webhook secret from Stripe Dashboard → Webhooks → [Your endpoint] → Signing secret
- See `VERCEL_ENV_SECURITY.md` for security best practices

---

## Production Deployment Steps

### 1. Deploy to Vercel/Production
```bash
git add .
git commit -m "Add Stripe billing integration"
git push origin main
```

### 2. Add Webhook in Stripe Dashboard
- Endpoint: `https://useluma.io/api/webhooks/stripe`
- Copy signing secret to production env vars

### 3. Test Production Flow
- Sign up with real email
- Use test card for checkout
- Verify webhook events in Stripe Dashboard

### 4. Monitor
- Stripe Dashboard → Events log
- Supabase → Check `users` table for subscription updates
- Application logs for any errors

---

## Support & Troubleshooting

### Issue: Webhook not receiving events
- Check Stripe Dashboard → Webhooks → Events
- Verify endpoint URL is correct
- Check webhook signing secret matches

### Issue: Trial not starting
- Verify `trial_ends_at` is set in database
- Check user record after signup

### Issue: Cases not resetting monthly
- Webhook `invoice.payment_succeeded` should trigger reset
- Check database trigger `trigger_reset_monthly_cases`

### Issue: User can't create cases
- Check `subscription_status` is `active` or `trialing`
- Check `cases_remaining` > 0
- Verify `trial_ends_at` is in future (if trialing)

---

## Next Steps (Optional Enhancements)

1. **Email Notifications** (using Resend)
   - Trial ending reminder (2 days before)
   - Payment failed notification
   - Subscription canceled confirmation

2. **Usage Analytics**
   - Track cases created per user
   - Revenue metrics dashboard
   - Conversion funnel (signup → trial → paid)

3. **Add-on Pricing** (Already configured in Stripe)
   - Extra seats: $15/mo
   - Extra cases: $3/case
   - Implement metered billing for overages

4. **Coupon Codes**
   - Allow promotion codes at checkout
   - Partner/referral discounts
   - Annual plan discount

---

## Files Created/Modified

### New Files:
- `supabase/migrations/20260117_add_subscription_fields.sql`
- `src/app/api/stripe/create-checkout/route.ts`
- `src/app/api/stripe/create-portal/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/checkout/page.tsx`
- `src/components/SubscribeButton.tsx`
- `src/components/dashboard/SubscriptionBanner.tsx`

### Modified Files:
- `src/app/auth/actions.ts` - Redirect to checkout after signup
- `src/app/(dashboard)/cases/new/page.tsx` - Add subscription checks
- `src/app/(dashboard)/dashboard/page.tsx` - Add subscription banner
- `src/components/landing/Hero.tsx` - Update copy
- `src/components/landing/CTASection.tsx` - Update copy

---

**Status**: ✅ READY FOR PRODUCTION

Just run the database migration and configure the webhook endpoint!
