# Vercel Environment Variables Checklist

## ✅ You Already Have (from your screenshot)

- [x] `PERPLEXITY_API_KEY`
- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [x] `STRIPE_WEBHOOK_SECRET`
- [x] `OPENAI_API_KEY`
- [x] All Sentry variables (SENTRY_*)

## ❌ Missing - Critical (Add These Now)

### 1. `SUPABASE_SERVICE_ROLE_KEY`
- **Where to get it:** Supabase Dashboard → Project Settings → API → `service_role` key
- **Why needed:** Server-side database operations, webhooks
- **Scope:** All Environments

### 2. `STRIPE_SECRET_KEY`
- **Where to get it:** Stripe Dashboard → Developers → API keys → Secret key
- **Why needed:** Server-side Stripe operations (creating checkout sessions, managing subscriptions)
- **Scope:** All Environments
- **Format:** `sk_live_...` or `sk_test_...`

### 3. `NEXT_PUBLIC_APP_URL`
- **Value:** Your production URL (e.g., `https://useluma.io`)
- **Why needed:** Stripe checkout redirect URLs
- **Scope:** All Environments (or set different for Production/Preview)

### 4. `NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL`
- **Where to get it:** Stripe Dashboard → Products → Your Professional plan → Price ID
- **Why needed:** Stripe checkout uses this to create subscriptions
- **Scope:** All Environments
- **Format:** `price_xxxxx...`

### 5. `NEXT_PUBLIC_STRIPE_PRICE_ID_EXTRA_SEAT`
- **Where to get it:** Stripe Dashboard → Products → Extra Seat add-on → Price ID
- **Why needed:** For add-on pricing functionality
- **Scope:** All Environments
- **Format:** `price_xxxxx...`

### 6. `NEXT_PUBLIC_STRIPE_PRICE_ID_EXTRA_CASES`
- **Where to get it:** Stripe Dashboard → Products → Extra Cases add-on → Price ID
- **Why needed:** For add-on pricing functionality
- **Scope:** All Environments
- **Format:** `price_xxxxx...`

## ⚠️ Optional - Recommended

### 7. `RESEND_API_KEY`
- **Where to get it:** Resend Dashboard → API Keys → Create new key
- **Why needed:** Email functionality (feedback widget, notifications)
- **Scope:** All Environments
- **Format:** `re_xxxxx...`

### 8. `RESEND_FROM_EMAIL` (Optional)
- **Value:** Your sender email (e.g., `noreply@useluma.io`)
- **Why needed:** Email sender address
- **Scope:** All Environments
- **Note:** Has default fallback in code

### 9. `RESEND_TO_EMAIL` (Optional)
- **Value:** Support email (e.g., `support@useluma.io`)
- **Why needed:** Where feedback emails are sent
- **Scope:** All Environments
- **Note:** Has default fallback in code

## 🔧 Optional - Only if Using GitHub Feedback

### 10. `GITHUB_TOKEN`
- **Where to get it:** GitHub → Settings → Developer settings → Personal access tokens
- **Why needed:** Creates GitHub issues from feedback widget
- **Scope:** All Environments

### 11. `GITHUB_OWNER`
- **Value:** Your GitHub username or organization
- **Why needed:** GitHub integration
- **Scope:** All Environments

### 12. `GITHUB_REPO`
- **Value:** Your repository name
- **Why needed:** GitHub integration
- **Scope:** All Environments

---

## 🚀 Quick Setup Steps

1. **Get Supabase Service Role Key:**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Settings → API → Copy `service_role` key

2. **Get Stripe Keys:**
   - Go to https://dashboard.stripe.com
   - Developers → API keys → Copy Secret key
   - Products → Find your prices → Copy Price IDs

3. **Set App URL:**
   - Use your production domain: `https://useluma.io`
   - Or use Vercel URL: `https://your-app.vercel.app`

4. **Add to Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add each variable
   - Set appropriate scope (Production/Preview/Development)

5. **Redeploy:**
   - After adding variables, trigger a new deployment
   - Or wait for next push to auto-deploy

---

## 📝 Notes

- All `NEXT_PUBLIC_*` variables are exposed to the client-side
- Variables without `NEXT_PUBLIC_` are server-side only (more secure)
- After adding variables, you may need to redeploy for them to take effect
- Test in Preview environment first before Production
