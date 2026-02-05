-- Delete test user account and all associated data
-- This script deletes the user with email: edwardgiann@mac.com

-- Step 1: Delete all cases for this user (if cascade doesn't work)
DELETE FROM public.cases 
WHERE user_id IN (
  SELECT id FROM public.users WHERE email = 'edwardgiann@mac.com'
);

-- Step 2: Delete user from public.users table
DELETE FROM public.users 
WHERE email = 'edwardgiann@mac.com';

-- Step 3: Delete user from auth.users (this is the main auth record)
-- Note: This requires service_role key or admin access
DELETE FROM auth.users 
WHERE email = 'edwardgiann@mac.com';

-- Optional: If you want to delete ALL users (for complete reset)
-- Uncomment the lines below:
-- DELETE FROM public.cases;
-- DELETE FROM public.users;
-- DELETE FROM auth.users;
