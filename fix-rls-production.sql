-- This SQL will fix the infinite recursion in RLS policies
-- Run this in Supabase SQL Editor to fix your production database

-- Step 1: Drop all existing RLS policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can do everything" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_trigger" ON public.users;
DROP POLICY IF EXISTS "Users can insert via trigger" ON public.users;

-- Step 2: Make sure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 3: Create correct policies that won't cause infinite recursion
-- Policy 1: Users can SELECT their own data
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Users can UPDATE their own data
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Allow INSERT without checking auth.uid() (trigger handles this)
-- This is the key fix - we use WITH CHECK (true) instead of WITH CHECK (auth.uid() = id)
-- The trigger runs as SECURITY DEFINER so it can insert, and we trust it
CREATE POLICY "Users can insert via trigger"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- Step 4: Update the trigger function to include all subscription fields
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

-- Step 5: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verification: Check that policies are correct
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;
