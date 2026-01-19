-- Verify and Fix RLS Policies for Checkout Issue
-- Run this in Supabase SQL Editor

-- Step 1: Check current policies
SELECT
  policyname,
  cmd,
  permissive,
  qual AS using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- Step 2: Check for duplicate INSERT policies (this is likely the issue)
-- If you see multiple INSERT policies, they might be conflicting

-- Step 3: Clean up - Remove ALL policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert via trigger" ON public.users;
DROP POLICY IF EXISTS "users_insert_trigger" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "Team members can view their team owner" ON public.users;

-- Step 4: Recreate ONLY the policies we need
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- This is the critical one - allows trigger to insert without recursion
CREATE POLICY "Users can insert via trigger"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- Step 5: Verify the trigger exists and is correct
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'public';

-- Step 6: If trigger is missing, recreate it
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    subscription_status,
    trial_ends_at,
    billing_period_end,
    cases_remaining,
    seats_count
  )
  VALUES (
    NEW.id,
    NEW.email,
    'trialing',
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '14 days',
    50,
    3
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Verify policies are now correct
SELECT
  policyname,
  cmd,
  permissive,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- Expected output:
-- 1. "Users can view own profile" - SELECT
-- 2. "Users can update own profile" - UPDATE
-- 3. "Users can insert via trigger" - INSERT with WITH CHECK = true
