# Checkout Flow Fix - "No subscription products found" / "User not found" Error

## Problem
When users sign up and immediately go to checkout, they get an error. The root cause is a **timing issue** where the `public.users` record hasn't been created yet by the trigger when the checkout API tries to look it up.

## Root Cause
1. User signs up → `auth.users` record is created
2. Database trigger `on_auth_user_created` should create `public.users` record
3. User immediately clicks "Start 14-Day Free Trial"
4. Checkout API queries `public.users` table
5. **Race condition**: If the trigger is slow, the record doesn't exist yet → Error

## Solution Implemented

### 1. Added Retry Mechanism (Primary Fix)
**File**: `src/app/api/stripe/create-checkout/route.ts`

Added a retry loop that attempts to find the user record up to 3 times with 500ms delays:

```typescript
// Retry mechanism: Sometimes the trigger hasn't created the public.users record yet
let user = null;
let userError = null;
const maxRetries = 3;

for (let attempt = 1; attempt <= maxRetries; attempt++) {
  const { data, error } = await adminClient
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (data) {
    user = data;
    break;
  }

  userError = error;

  if (attempt < maxRetries) {
    console.log(`[Checkout] User not found on attempt ${attempt}, retrying in 500ms...`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
```

**Why this works**:
- Gives the trigger time to complete (up to 1.5 seconds total)
- Most triggers complete in < 100ms, so this is generous
- Doesn't break the user experience (users expect a few seconds for payment processing)

### 2. Diagnostic Tools Created

#### `diagnose-checkout-issue.mjs`
Run this to check:
- If trigger exists and is active
- RLS policies on users table
- User count consistency between auth.users and public.users
- Test user lookups with service role

```bash
node diagnose-checkout-issue.mjs
```

#### `verify-and-fix-rls.sql`
SQL script to run in Supabase SQL Editor that:
1. Shows current RLS policies
2. Removes ALL policies (cleans up duplicates)
3. Recreates only the 3 policies we need
4. Verifies trigger exists
5. Recreates trigger if missing

**When to use**: If the retry mechanism doesn't fix the issue, there may be conflicting RLS policies in production. Run this SQL to clean them up.

## Why This Happened Now

Looking at git history, the issue likely appeared because:
1. Previous fixes (commits `f5f56b6`, `945d18e`) addressed RLS recursion issues
2. Those fixes work, but there's still a race condition
3. As more users sign up, the timing issue becomes more apparent under load
4. Database triggers can be delayed during high load or network latency

## Testing

### To test the fix:
1. Deploy the updated `create-checkout/route.ts` file
2. Sign up as a new user
3. Immediately click "Start 14-Day Free Trial"
4. Should see console logs showing retries if needed
5. Checkout should succeed within ~1-2 seconds

### If still failing:
1. Run `node diagnose-checkout-issue.mjs` to identify the issue
2. Check logs in Supabase Dashboard → Logs → Functions
3. Run `verify-and-fix-rls.sql` in Supabase SQL Editor to fix policies
4. Verify trigger exists: Database → Functions → `handle_new_user`

## Additional Context

### Current RLS Setup (Correct)
```sql
-- SELECT: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: Allow trigger to insert (no auth.uid() check to avoid recursion)
CREATE POLICY "Users can insert via trigger"
  ON public.users FOR INSERT
  WITH CHECK (true);
```

### Checkout API Auth Flow
1. ✅ Uses `getUser()` (not `getSession()`) - more secure
2. ✅ Verifies authentication before DB queries
3. ✅ Uses service role key to bypass RLS - safe because auth is already verified
4. ✅ Now includes retry mechanism for timing issues

## Files Modified
- ✅ `src/app/api/stripe/create-checkout/route.ts` - Added retry mechanism
- ✅ `diagnose-checkout-issue.mjs` - New diagnostic tool
- ✅ `verify-and-fix-rls.sql` - SQL cleanup script
- ✅ `CHECKOUT_FIX.md` - This documentation

## References
- Original issue: `TROUBLESHOOTING_LOG.md`
- Related commits: `f5f56b6`, `945d18e`, `4e112b7`
- Schema: `supabase/schema.sql`
- Trigger: `supabase/migrations/20260118_fix_user_creation_trigger.sql`
