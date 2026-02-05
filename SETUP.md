# Luma - Complete Setup Guide

This guide will walk you through setting up Luma from scratch.

## 📋 Prerequisites Checklist

Before you begin, ensure you have:

- [ ] Node.js 18 or higher installed
- [ ] npm or yarn package manager
- [ ] Git installed
- [ ] A code editor (VS Code recommended)
- [ ] GitHub account (for deployment)

## 🔑 Required API Keys & Services

You'll need to sign up for these services (all have free tiers):

1. **Supabase** (Database & Auth)
   - Sign up at https://supabase.com
   - Free tier: Unlimited API requests, 500MB database

2. **Anthropic** (Claude AI)
   - Get API key at https://console.anthropic.com
   - Pay-as-you-go: ~$0.003 per request

3. **Stripe** (Payments)
   - Sign up at https://stripe.com
   - Test mode available for development

4. **Resend** (Emails)
   - Sign up at https://resend.com
   - Free tier: 3,000 emails/month

5. **Vercel** (Hosting - Optional but recommended)
   - Sign up at https://vercel.com
   - Free tier: Unlimited hobby projects

## 🚀 Step-by-Step Setup

### Step 1: Clone and Install

```bash
# Navigate to where you want the project
cd ~/projects

# Clone the repository (or create from scratch)
git clone <your-repo-url> luma
cd luma

# Install all dependencies
npm install
```

### Step 2: Set Up Supabase

1. **Create a new project**
   - Go to https://supabase.com/dashboard
   - Click "New Project"
   - Choose a name: "Luma" or "luma-prod"
   - Set a strong database password (save this!)
   - Choose a region close to you

2. **Get your API credentials**
   - Go to Project Settings > API
   - Copy these values:
     * Project URL (NEXT_PUBLIC_SUPABASE_URL)
     * anon/public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
     * service_role key (SUPABASE_SERVICE_ROLE_KEY)

3. **Run the database schema**
   - Go to SQL Editor in your Supabase dashboard
   - Click "New Query"
   - Copy and paste the entire contents of `supabase/schema.sql`
   - Click "Run"
   - You should see "Success. No rows returned"

4. **Enable Email Authentication**
   - Go to Authentication > Providers
   - Enable "Email" provider
   - Configure email templates (optional)

5. **Set up redirect URLs** (for production later)
   - Go to Authentication > URL Configuration
   - Site URL: `http://localhost:3000` (for now)
   - Redirect URLs: `http://localhost:3000/auth/callback`

### Step 3: Get Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Click "Get API Keys"
4. Create a new key
5. Copy the key (starts with `sk-ant-...`)
6. Add $5-10 credit to your account for testing

### Step 4: Set Up Stripe (Optional - for payments)

1. Go to https://dashboard.stripe.com
2. Sign up or log in
3. Toggle to "Test mode" (top right)
4. Go to Developers > API keys
5. Copy:
   - Publishable key (starts with `pk_test_...`)
   - Secret key (starts with `sk_test_...`)
6. Go to Developers > Webhooks > Add endpoint (later)
   - Endpoint URL: `https://your-app.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`

### Step 5: Get Resend API Key (Optional - for emails)

1. Go to https://resend.com/api-keys
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `re_...`)

### Step 6: Configure Environment Variables

1. Copy the example file:
```bash
cp .env.example .env.local
```

2. Open `.env.local` and fill in all values:

```env
# Supabase (from Step 2)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Anthropic (from Step 3)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx...

# Stripe (from Step 4 - optional for MVP)
STRIPE_SECRET_KEY=sk_test_xxxxx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx...
STRIPE_WEBHOOK_SECRET=whsec_xxxxx...

# Resend (from Step 5 - optional for MVP)
RESEND_API_KEY=re_xxxxx...

# App URL (change when deploying)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Save the file

### Step 7: Run the Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

You should see the Luma landing page! 🎉

### Step 8: Test Authentication

1. Click "Get Started" or "Sign Up"
2. Enter an email and password
3. Check your email for a confirmation link (if email is configured)
4. Or check the Supabase dashboard > Authentication > Users

### Step 9: Initialize Git (if not already done)

```bash
git init
git add .
git commit -m "Initial commit - Luma setup complete"
```

## 🌐 Deploying to Production

### Option 1: Deploy to Vercel (Recommended)

1. **Push to GitHub**
```bash
# Create a new repo on GitHub first, then:
git remote add origin https://github.com/yourusername/luma.git
git branch -M main
git push -u origin main
```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Add Environment Variables**
   - In Vercel project settings > Environment Variables
   - Add ALL variables from your `.env.local`
   - IMPORTANT: Change `NEXT_PUBLIC_APP_URL` to your Vercel URL
   - Example: `https://luma.vercel.app`

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app will be live!

5. **Update Supabase URLs**
   - Go back to Supabase > Authentication > URL Configuration
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/auth/callback`

6. **Test Production**
   - Visit your Vercel URL
   - Try signing up and logging in
   - Create a test case

### Option 2: Deploy to Your Own Server

1. Build the app:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

3. Use PM2 or similar to keep it running:
```bash
npm install -g pm2
pm2 start npm --name "luma" -- start
pm2 save
```

## 🧪 Testing the Application

### Test Checklist

- [ ] Landing page loads
- [ ] Can sign up with email
- [ ] Can log in
- [ ] Dashboard displays
- [ ] Can create a new case
- [ ] Form validation works
- [ ] Can generate documentation (requires Anthropic API key)
- [ ] Can export to Word (requires docx setup)
- [ ] Can export to PDF (requires pdfkit setup)
- [ ] Cases table displays correctly
- [ ] Can edit existing cases
- [ ] Can delete cases

### Sample Test Data for Case Creation

```
Patient First Name: Sarah
Patient Last Name: Johnson
Age: 52
State: Texas
Gender: Female

Primary Diagnosis: M05.79 (Rheumatoid arthritis with rheumatoid factor)

Disease Activity:
DAS28 score: 5.2
HAQ: 2.1
Morning stiffness: 3 hours

Lab Values:
CRP: 45 mg/L (elevated, normal <10)
ESR: 60 mm/hr (elevated, normal <20)
RF: Positive at 85 IU/mL
Anti-CCP: Positive at 120 U/mL

Prior Treatments:
1. Methotrexate 25mg weekly for 16 weeks - inadequate response
2. Sulfasalazine 3g daily for 12 weeks - inadequate response
3. Hydroxychloroquine 400mg daily for 10 weeks - inadequate response

Requested Medication: Humira (adalimumab)
Dose/Frequency: 40mg subcutaneously every 2 weeks

Payer: Medicare Traditional
```

## 🐛 Troubleshooting

### Common Issues

**Issue: "Module not found" errors**
Solution:
```bash
rm -rf node_modules package-lock.json
npm install
```

**Issue: Supabase connection fails**
- Check your `.env.local` has correct URL and keys
- Ensure there are no spaces or quotes around values
- Restart dev server: `npm run dev`

**Issue: Authentication doesn't work**
- Check Supabase > Authentication > URL Configuration
- Ensure redirect URLs match exactly (no trailing slashes)
- Check browser console for errors

**Issue: Claude API fails**
- Check your ANTHROPIC_API_KEY is correct
- Ensure you have credits in your Anthropic account
- Check rate limits (free tier: 50 requests/min)

**Issue: Build fails on Vercel**
- Check all environment variables are set
- Look at build logs for specific errors
- Ensure TypeScript has no errors: `npm run build` locally

**Issue: Database queries fail**
- Check Row Level Security policies in Supabase
- Ensure user is authenticated
- Check browser console and network tab

## 📊 Monitoring & Logs

### Development
- Console logs: Check terminal running `npm run dev`
- Browser console: Check for client-side errors
- Network tab: Check API requests/responses

### Production (Vercel)
- Go to your project > Deployments > Latest > Logs
- Check for server errors
- Monitor function execution times

### Supabase
- Database > Logs: SQL queries
- Authentication > Logs: Auth events
- API > Logs: API requests

## 🔐 Security Checklist Before Launch

- [ ] All environment variables are set in production
- [ ] `.env.local` is in `.gitignore`
- [ ] Supabase RLS policies are enabled
- [ ] Service role key is only used server-side
- [ ] Stripe is in test mode until ready
- [ ] CORS is configured properly
- [ ] Rate limiting is enabled (Vercel Edge Config)
- [ ] Error messages don't expose sensitive info

## 📈 Next Steps

After basic setup is working:

1. **Complete the Authentication UI**
   - Build login page
   - Build signup page
   - Add password reset flow

2. **Build the Dashboard**
   - Cases table with search/filter
   - Create new case button
   - Stats/analytics cards

3. **Build the Case Form**
   - Multi-step form or single page
   - Form validation
   - Diagnosis code autocomplete

4. **Integrate Claude API**
   - Create generation endpoint
   - Build prompt templates
   - Handle errors gracefully

5. **Add Export Functionality**
   - Word document generation
   - PDF generation
   - Copy to clipboard

6. **Set Up Payments**
   - Stripe Checkout integration
   - Subscription management
   - Usage tracking

## 🆘 Getting Help

If you run into issues:

1. Check the README.md
2. Check this SETUP.md
3. Look at the code comments
4. Check Next.js documentation
5. Check Supabase documentation
6. Open an issue on GitHub

## 🎉 You're Ready!

If you've completed all steps, you now have:
- ✅ A working Next.js application
- ✅ Supabase database configured
- ✅ Authentication working
- ✅ Development environment set up
- ✅ Ready to deploy to production

Happy building! 🚀
