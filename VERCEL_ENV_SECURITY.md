# Vercel Environment Variables - Security Guide

## 🔒 Keys You Should NEVER Share Publicly

These environment variables contain **sensitive credentials** and should **NEVER** be:
- Committed to Git
- Shared in documentation
- Posted in public forums
- Exposed in screenshots
- Included in public repositories

### Critical Secrets (Server-Side Only)

1. **`SUPABASE_SERVICE_ROLE_KEY`** ⚠️
   - Full database access with admin privileges
   - Can bypass Row Level Security (RLS)
   - **NEVER share this key**

2. **`STRIPE_SECRET_KEY`** ⚠️
   - Full access to your Stripe account
   - Can create charges, refunds, access customer data
   - Starts with `sk_live_...` or `sk_test_...`
   - **NEVER share this key**

3. **`STRIPE_WEBHOOK_SECRET`** ⚠️
   - Used to verify webhook authenticity
   - Starts with `whsec_...`
   - **NEVER share this key**

4. **`ANTHROPIC_API_KEY`** ⚠️
   - Access to Claude AI API
   - Can incur charges on your account
   - Starts with `sk-ant-...`
   - **NEVER share this key**

5. **`OPENAI_API_KEY`** ⚠️
   - Access to OpenAI API
   - Can incur charges on your account
   - Starts with `sk-...`
   - **NEVER share this key**

6. **`PERPLEXITY_API_KEY`** ⚠️
   - Access to Perplexity API
   - Can incur charges on your account
   - **NEVER share this key**

7. **`RESEND_API_KEY`** ⚠️
   - Access to Resend email service
   - Can send emails from your domain
   - Starts with `re_...`
   - **NEVER share this key**

8. **`GITHUB_TOKEN`** ⚠️
   - Personal access token for GitHub
   - Can access repositories and create issues
   - **NEVER share this key**

---

## ✅ Keys That Are Safe to Share (But Still Be Careful)

These variables are **public** (exposed to client-side) but should still be managed carefully:

1. **`NEXT_PUBLIC_SUPABASE_URL`**
   - Your Supabase project URL
   - Publicly accessible anyway
   - Safe to share, but don't expose unnecessarily

2. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
   - Supabase anonymous/public key
   - Protected by Row Level Security (RLS)
   - Safe to share, but don't expose unnecessarily

3. **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`**
   - Stripe publishable key
   - Designed to be public (used in frontend)
   - Safe to share, but don't expose unnecessarily

4. **`NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL`**
   - Stripe price ID for products
   - Public pricing information
   - Safe to share

5. **`NEXT_PUBLIC_APP_URL`**
   - Your application URL
   - Publicly accessible
   - Safe to share

---

## 📋 Best Practices for Vercel

### ✅ DO:
- Add all environment variables in Vercel Dashboard → Settings → Environment Variables
- Use different values for Production, Preview, and Development environments
- Rotate keys immediately if exposed
- Use Vercel's environment variable encryption (automatic)
- Keep a secure backup of your keys (password manager)

### ❌ DON'T:
- Commit `.env.local` or `.env` files to Git
- Share screenshots of your Vercel environment variables page
- Include real API keys in documentation or README files
- Use the same keys for development and production
- Share keys in Slack, Discord, or other chat platforms

---

## 🚨 If You've Already Exposed Keys

If you've accidentally committed or shared any of the critical secrets above:

1. **Immediately rotate/regenerate the key:**
   - Supabase: Project Settings → API → Reset service_role key
   - Stripe: Developers → API keys → Create new secret key
   - Anthropic: Console → API Keys → Revoke old key, create new
   - OpenAI: API Keys → Revoke and create new
   - Perplexity: API Keys → Regenerate
   - Resend: API Keys → Delete and create new
   - GitHub: Settings → Developer settings → Personal access tokens → Revoke

2. **Update Vercel environment variables** with the new keys

3. **Remove exposed keys from Git history** (if committed):
   ```bash
   # Use git-filter-repo or BFG Repo-Cleaner
   # Or contact GitHub support if already pushed
   ```

4. **Check for unauthorized access:**
   - Review API usage logs
   - Check for unexpected charges
   - Monitor for suspicious activity

---

## 📝 Current Status Check

Based on your codebase, I found that **`STRIPE_SETUP.md` contains exposed API keys**. 

**Action Required:**
1. Rotate all keys listed in that file
2. Remove the actual keys from `STRIPE_SETUP.md`
3. Replace with placeholder values like `sk_live_xxxxx...`

---

## 🔐 Environment Variable Checklist

Before deploying to Vercel, ensure:

- [ ] All secrets are added to Vercel (not committed to Git)
- [ ] `.env.local` is in `.gitignore` ✅ (already done)
- [ ] No real API keys in documentation files
- [ ] Different keys for production vs development
- [ ] All `NEXT_PUBLIC_*` variables are set correctly
- [ ] Webhook secrets match between Stripe and Vercel
- [ ] Service role keys are only used server-side

---

## 📚 Additional Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
