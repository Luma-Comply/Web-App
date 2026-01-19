# Checkout "User not found" Error - Troubleshooting Log

## Problem
When users sign up and click "Start 14-Day Free Trial", they get an error: **"User not found"**

## Root Cause
RLS (Row Level Security) infinite recursion error on the `public.users` table. The INSERT policy was checking `auth.uid() = id`, which caused infinite recursion when the trigger tried to insert a new user.

## What We Tried

### 1. ✅ Verified the trigger exists and works
- Created `test-trigger.mjs` script
- Confirmed trigger successfully creates users in `public.users` when auth users are created
- Trigger works correctly in isolation

### 2. ✅ Fixed authentication method in checkout API
- Changed from `getSession()` to `getUser()` in `/src/app/api/stripe/create-checkout/route.ts`
- Supabase recommends `getUser()` for server-side auth checks
- This was good practice but didn't fix the issue

### 3. ✅ Identified RLS infinite recursion
- Created `check-rls.mjs` script
- Discovered error: `"infinite recursion detected in policy for relation users"`
- The old INSERT policy had `WITH CHECK (auth.uid() = id)` which caused recursion

### 4. ✅ Fixed RLS policies in schema
- Updated `/supabase/schema.sql` with correct policies:
  - SELECT: `USING (auth.uid() = id)` ✅
  - UPDATE: `USING (auth.uid() = id) WITH CHECK (auth.uid() = id)` ✅
  - INSERT: `WITH CHECK (true)` ✅ (key fix - no auth.uid() check)
- Created `fix-rls-production.sql` with the corrected SQL

### 5. ✅ Ran SQL in Supabase SQL Editor
- User manually ran the SQL in production database
- Confirmed policy "Users can insert via trigger" exists with `WITH CHECK (true)`
- SQL executed successfully

### 6. ❌ Still getting "User not found" error
- Even after fixing RLS policies, checkout still fails
- Tested on production after deleting all users
- Error persists

## Current State

### What's in Production Database
According to Supabase Dashboard screenshots, there are **multiple INSERT policies**:
1. "Users can insert via trigger" (correct - `WITH CHECK (true)`)
2. "users_insert_trigger" (duplicate? might be old)
3. "Team members can view their team owner" (SELECT - unrelated)

### Theory: Multiple conflicting policies
The issue might be that **multiple INSERT policies exist** and they're conflicting:
- One says `WITH CHECK (true)` ✅
- Another might still have `WITH CHECK (auth.uid() = id)` ❌

When multiple policies exist, PostgreSQL requires ALL of them to pass (unless they're RESTRICTIVE).

## Next Steps to Fix

### Solution 1: Delete ALL policies and recreate from scratch
```sql
-- Delete EVERYTHING
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert via trigger" ON public.users;
DROP POLICY IF EXISTS "users_insert_trigger" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "Team members can view their team owner" ON public.users;

-- Recreate ONLY the three we need
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert via trigger"
  ON public.users FOR INSERT
  WITH CHECK (true);
```

### Solution 2: Temporarily disable RLS to confirm it's the issue
```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```
Then test checkout. If it works, we know RLS is the problem. Re-enable after:
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

### Solution 3: Check for restrictive policies
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,  -- Should be 'PERMISSIVE' not 'RESTRICTIVE'
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;
```

## Files Created
- `/check-rls.mjs` - Detects RLS infinite recursion
- `/test-trigger.mjs` - Tests if trigger works
- `/fix-rls-production.sql` - SQL to fix policies
- `/check-policies.mjs` - Attempts to query current policies
- `/delete-all-users.mjs` - Cleans database for testing
- `/apply-rls-fix.mjs` - Attempted to run SQL via API (failed - no exec function)
- `/apply-rls-fix-api.mjs` - Attempted REST API approach (failed - no endpoint)

## Key Learnings
1. **RLS infinite recursion** happens when INSERT policies check `auth.uid()` during trigger execution
2. **Multiple policies** can conflict even if one is correct
3. **Supabase client can't execute arbitrary SQL** - must use SQL Editor manually
4. **Trigger runs as SECURITY DEFINER** so it should bypass RLS, but INSERT policies still apply

## Recommended Action
Go to Supabase SQL Editor and run Solution 1 above to delete ALL policies and recreate only the 3 we need. This will eliminate any conflicting policies.

## Testing Flow
After fixing:
1. Delete all users: `node delete-all-users.mjs`
2. Go to production signup
3. Create new account
4. Verify user appears in Supabase `auth.users` AND `public.users`
5. Click "Start 14-Day Free Trial"
6. Should redirect to Stripe checkout (not "User not found")
