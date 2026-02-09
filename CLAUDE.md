# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

You are the team lead. I'm the strategist — I set direction, you run execution.

CONTEXT:
- Stack: Next.js 15, React, TypeScript, Tailwind. Backend varies by project.
- I have 15 years of UX/product design experience. Don't explain design rationale to me — just execute or challenge with specifics.
- I want ruthless, unfiltered feedback between teammates. Test every idea until it's bulletproof.
- ADA/WCAG compliance is non-negotiable on everything.

When I describe work, do the following:

1. Break it into a shared task list with clear dependencies
2. Spin up teammates with defined roles (assign Opus for architecture, data modeling, security, and complex logic — Sonnet for UI components, tests, and straightforward implementation)
3. Route coordination between teammates directly — never ask me to relay messages
4. Only escalate to me when there's a genuine product tradeoff, ambiguity, or a decision that affects user experience strategy
5. When a teammate finishes work that unblocks another, hand it off automatically
6. Give me a status summary at milestone completion, not after every micro-task

RULES:
- Teammates challenge each other's work. Security reviewer pushes back on API design. Frontend validates endpoint contracts with backend before building. No rubber-stamping.
- If a teammate is blocked, resolve it between teammates first. Escalate only if it requires a product decision.
- Keep a running task board I can check anytime: task, owner, status, blockers.
- A task isn't done until it's tested, passes lint, and the teammate has verified it integrates with adjacent work.
- When you make a judgment call without me, log it with your reasoning so I can audit later.

I give you the what and the why. You figure out the who and the how.

## Project Overview

Luma is a HIPAA-compliant AI-powered platform for generating medical necessity documentation for biologics prior authorizations. The platform helps healthcare providers create audit-proof documentation while avoiding HIPAA violations by using a "Safe Harbor" approach (no PHI required - only patient name + clinical data).

## Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19 and TypeScript
- **Database**: Supabase (PostgreSQL with Row Level Security enabled)
- **Authentication**: Supabase Auth (email-based)
- **AI**: OpenAI GPT-4o + Perplexity API (Sonar Pro for research)
- **Payments**: Stripe with webhook integration
- **Email**: Resend for transactional emails
- **Monitoring**: Sentry (configured with source maps)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Animations**: Framer Motion + GSAP
- **File Generation**: docx (Word), jspdf (PDF)

## Development Commands

```bash
# Development server (runs on http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Hooks Required for Every Code Change

Hooks are mandatory. Hooks must be used to run code automatically before and after any change Claude makes. The goal is to catch problems immediately instead of letting them pile up.

Whenever you touch code, you must ensure the project hooks run.

### What Hooks Are For

Hooks exist to enforce quality, consistency, and safety on every edit.

Examples include:
- Prettier or formatters on every file you touch
- Type checking after every edit
- Linting and tests when available

This process is required to prevent technical debt from forming.

### Required Behavior

**Before completing any change:**
- Run formatting hooks on all modified files

**After completing any change:**
- Run type checking
- Run linting if available
- Run tests if available

**If any hook fails:**
- Fix the issue before continuing
- Do not stack new changes on top of failing hooks

### Long Change Safety Check

For large edits, additional checkpoints are required.

**After every 1000 lines changed or generated:**
- Re-run format, lint, and type checks
- Run security checks if available

This is mandatory for refactors, migrations, or large feature work.

### Pull Request Readiness

Before any pull request is considered ready:
- All hooks must pass
- Formatting, linting, type checks, tests, and any security checks required by the project

## Think First, Then Code

Do not jump straight into implementation.

Before writing or modifying code, always pause and reason about the task.

For anything non-trivial, you must first
- Clarify the goal and success criteria
- Identify what already exists in the codebase
- Decide the simplest possible approach
- Confirm the intended end state before building

Bias strongly toward planning before execution.

If the task involves architecture, refactors, or multi-file changes
- Start with a brief plan
- Outline the approach
- Call out tradeoffs
- Only then move to implementation

Thinking first is mandatory. Coding is second.

## What NOT to Do

Claude has known tendencies that must be actively avoided. The default behavior must always be minimal, simple, and contained.

### Do Not Overengineer

Do NOT introduce:
- Extra files unless absolutely required
- New folders for small changes
- Abstractions that were not explicitly requested
- "Future-proofing" or speculative flexibility
- Frameworks or systems when a direct solution works

If something can be solved in a few lines, do not turn it into a system.

### Keep Changes Minimal and Local

**Prefer:**
- One file when possible
- Small, direct edits
- Existing patterns already used in the codebase

**Avoid:**
- Spreading logic across many files
- Creating helper layers without a clear, current need
- Refactors that were not explicitly requested

### Do Not Invent Scope

Only build exactly what is asked.

Do NOT:
- Add features that were not requested
- Prepare for hypothetical use cases
- Rewrite working code without a concrete reason
- Turn simple fixes into "architectures"

### Technical Debt Awareness

Before producing a solution, always cross-check.

**Ask internally:**
- Did this actually need this many files?
- Could this be simpler?
- Did I introduce unnecessary moving parts?

If a task could realistically be done with a couple lines of code, it should not result in many files.

### Simplicity Override

When instructions include:
- "Keep this simple"
- "Minimal solution"
- "One file if possible"

You must strongly bias toward the smallest working implementation, even if it feels less engineered.

## Debugging Approach

When a fix attempt doesn't work, step back and reconsider the root cause before trying another surface-level patch. After 2 failed attempts at the same issue, explicitly analyze what's actually causing the problem rather than applying incremental changes.

**Before fixing bugs:**
1. Read all relevant files and trace the data/logic flow
2. Identify the ROOT CAUSE with evidence
3. Only then propose and implement a fix

**For SSE/streaming issues:** Check polling logic, database status constraints, and whether the client correctly detects state transitions.

**For UI state bugs:** Verify React component remounting, useEffect dependencies, and ref persistence across renders.

## CSS & Styling

When fixing CSS/styling issues, always check for:
1. CSS specificity conflicts
2. Shared styles bleeding between components
3. Third-party library interference (e.g., Lenis smooth scroll, Framer Motion)
4. Undefined CSS variables

Prefer scoped/component-level styles over global overrides.

**For responsive/mobile issues:**
- Always test with mobile breakpoints in mind
- Stack content vertically for mobile
- Check for horizontal overflow caused by fixed widths, padding, or overflow properties
- Verify scroll behavior on mobile specifically

**Design tokens:** Always use existing Tailwind config colors and CSS variables. Check `globals.css` and `tailwind.config.ts` before introducing new color values.

## Communication

When the user says "stop" or rejects an approach, immediately halt and wait for new instructions. Do not continue elaborating on the abandoned approach.

When the user provides visual feedback or screenshots, trust their assessment of what's wrong - they can see the rendered output.

## Workflow Conventions

When existing scripts or tools exist in the project for a task (e.g., build scripts, deployment, database migrations), run them directly instead of creating manual workarounds or waiting for the user to run them.

**Run these automatically when relevant:**
- `npm run dev` - Start dev server
- `npx tsc --noEmit` - Type check after edits
- `npm run build` - Verify production build
- Supabase migrations via MCP tools

## Operating Philosophy

This codebase prioritizes
- Correctness over cleverness
- Simplicity over flexibility
- Maintenance over novelty
- Small changes over big rewrites

The primary goals are
- Prevent technical debt
- Catch issues immediately with hooks
- Keep implementations minimal and readable
- Avoid unnecessary surface area

Claude should behave like a senior engineer maintaining a production system
- Not a demo engineer
- Not a framework designer
- Not a code generator

Every decision should bias toward
- The smallest working change
- The fewest moving parts
- The easiest code to delete later

## Architecture Overview

### Route Structure

The app uses Next.js App Router with route groups:

- **`(dashboard)/`** - Protected routes requiring authentication
  - `dashboard/` - Main dashboard with case statistics
  - `cases/new/` - Create new documentation case
  - `cases/[id]/` - View/edit individual case
  - `settings/` - User settings (profile, team, billing)

- **`auth/`** - Authentication flows
  - `signup/` - User registration
  - Login is handled via landing page modal (SignInDialog component)
  - `auth/callback/` - OAuth callback handler
  - `auth/confirm/` - Email confirmation

- **Root routes**
  - `/` - Landing page
  - `/checkout` - Stripe checkout flow
  - `/forgot-password` - Password reset
  - `/update-password` - Password update after reset
  - `/team/accept` - Team invitation acceptance

### API Routes

All API routes are in `src/app/api/`:

- **`generate/biologics-pa/`** - Two-step AI generation:
  1. Research payer requirements with Perplexity API (Sonar Pro model)
  2. Generate documentation with OpenAI GPT-4o
  Returns documentation + citations

- **`process-document/`** - Document upload and processing with Mammoth/PDF parsing

- **`stripe/`** - Stripe integration
  - `create-checkout/` - Initialize checkout session
  - `create-portal/` - Customer portal access
  - `cancel-subscription/` - Subscription cancellation

- **`webhooks/stripe/`** - Stripe webhook handler for subscription events

- **`team/`** - Team management
  - `invite/` - Send team invitation
  - `accept/` - Accept invitation
  - `remove/` - Remove team member
  - `cancel-invitation/` - Cancel pending invitation

- **`feedback/`** - User feedback submission

### Database Schema

See `supabase/schema.sql` for complete schema. Key tables:

**`users`** - Extends auth.users
- Profile info: NPI, specialty, practice_name
- Subscription tracking: subscription_tier, cases_remaining_this_month
- Linked 1:1 with auth.users via trigger

**`cases`** - Documentation cases
- Patient info: first_name, last_name, age, state, gender (HIPAA Safe Harbor compliant)
- Clinical data: diagnosis_codes (JSONB), disease_activity, lab_values, prior_treatments
- Medication: requested_medication, medication_dose
- Payer: payer_type, payer_name
- Outputs: generated_output, edited_output
- Status: chat | draft | generating | submitted | approved | denied
- doc_type: biologics_pa | medical_necessity | appeal

**Row Level Security (RLS)** is enabled on all tables. Users can only access their own data via `auth.uid() = user_id` policies.

### Supabase Client Usage

The codebase uses two Supabase clients:

**Browser Client** (`src/lib/supabase/client.ts`):
```typescript
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```
Use in Client Components only.

**Server Client** (`src/lib/supabase/server.ts`):
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```
Use in Server Components, Server Actions, and API Routes. Note: this is async.

### Authentication Flow

1. User signs up → Supabase creates auth.users record
2. Trigger automatically creates corresponding public.users record
3. Email confirmation required (magic link)
4. Session stored in cookies via Supabase SSR
5. Protected routes check auth in Server Components

### Stripe Integration

**Subscription Model**: Professional plan at $149/mo (50 cases, 3 seats)

Key files:
- `src/lib/stripe.ts` - Stripe client, price IDs, status helpers
- `src/app/api/webhooks/stripe/route.ts` - Webhook handler

Webhook events handled:
- `checkout.session.completed` - Activate subscription
- `customer.subscription.updated` - Update subscription status
- `customer.subscription.deleted` - Cancel subscription

**Important**: Webhook signature verification required using `STRIPE_WEBHOOK_SECRET`.

### AI Generation Flow

Located in `src/app/api/generate/biologics-pa/route.ts`:

1. **Research Phase**: Query Perplexity API (Sonar Pro) for current payer requirements
   - LCD/NCD criteria
   - Step therapy requirements
   - Documentation requirements

2. **Generation Phase**: Use OpenAI GPT-4o to generate compliant documentation
   - Takes research results + patient data
   - Formats with headers and compliance checklist
   - Returns markdown/HTML formatted output

3. Response includes both generated documentation and source citations

### Email Service

Located in `src/lib/email-service.ts`. Uses Resend API for:
- Email change notifications
- Password change notifications
- Team invitations (in `src/lib/email.ts`)

Default from address: `Luma <noreply@useluma.io>`

### Component Structure

**UI Components** (`src/components/ui/`):
- shadcn/ui components (button, dialog, input, select, etc.)
- Highly customizable via Tailwind variants

**Feature Components** (`src/components/`):
- `LumaLogo.tsx` - Animated SVG logo
- `FeedbackWidget.tsx` - Feedback submission widget (appears on dashboard)
- `SignInDialog.tsx` - Login modal for landing page
- `CheckoutButton.tsx` - Stripe checkout integration
- `AnimatedNumber.tsx` - Animated number counter
- Animation components: EKGDivider, MedicalGrid, ScrollReveal, TextureOverlay

**Dashboard Components** (`src/components/dashboard/`):
- Case-related and dashboard-specific components

**Landing Components** (`src/components/landing/`):
- Landing page sections and marketing components

### Styling & Theming

Brand colors defined in `tailwind.config.ts` and `globals.css`:
```css
--dark-bg: #131317
--light-gray: #E0E0D9
--sage-light: #B7D0C1
--mint: #7EA18D (primary)
--coral: #EC624F (destructive/accent)
--tan: #BB966D
```

Uses CSS variables for theming throughout the app.

### Important HIPAA Compliance Notes

**Safe Harbor De-identification Strategy**:
- ❌ NO date of birth (use age instead)
- ❌ NO SSN, MRN, addresses, phone, email
- ❌ NO specific dates (use relative dates)
- ✅ ONLY patient name + clinical data
- ✅ Age or age range
- ✅ State only (no full address)

This approach means name + clinical data ≠ PHI under Safe Harbor rules, avoiding BAA requirements.

### Environment Variables

Required in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=
PERPLEXITY_API_KEY=

STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL=
NEXT_PUBLIC_STRIPE_PRICE_ID_EXTRA_SEAT=
NEXT_PUBLIC_STRIPE_PRICE_ID_EXTRA_CASES=

RESEND_API_KEY=
RESEND_FROM_EMAIL=

NEXT_PUBLIC_APP_URL=
```

### Sentry Configuration

Monitoring is configured via `next.config.ts` with:
- Source maps disabled for production
- Tunnel route at `/monitoring` to bypass ad-blockers
- React component annotations for better error tracking
- Tree-shaking of debug logging

### Common Patterns

**Server Actions**: Use `'use server'` directive for form submissions and mutations. Located in `src/app/actions/` or `src/app/auth/actions.ts`.

**Database Queries**: Always use Supabase client with RLS. Users are automatically filtered by `user_id` via policies.

**Error Handling**: Return `{ error: string }` objects from API routes. Use try-catch blocks consistently.

**Type Safety**: Database types auto-generated in `src/lib/database.types.ts`. Use these for all DB operations.

### File Generation

- **Word (.docx)**: Uses `docx` library
- **PDF**: Uses `jspdf` and `jspdf-autotable` libraries
- Export functionality likely in case detail pages

### Key Utilities

`src/lib/utils.ts` - Contains `cn()` utility for Tailwind class merging (clsx + tailwind-merge).

### Next.js Configuration

`next.config.ts` includes:
- Server Actions body size limit: 2MB
- Sentry integration with webpack plugins
- Source map configuration

### Deployment

Deployed on Vercel. Remember to:
1. Set all environment variables in Vercel dashboard
2. Configure Supabase redirect URLs to include Vercel domain
3. Configure Stripe webhook endpoint to Vercel domain
4. Sentry DSN configured for error tracking
