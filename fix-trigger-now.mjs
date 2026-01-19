import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Creating trigger in production database...\n');

// First, let's check current auth users
const { data: authUsers } = await supabase.auth.admin.listUsers();
console.log('Auth users:', authUsers.users.map(u => u.email));

// Check public users
const { data: publicUsers } = await supabase.from('users').select('email');
console.log('Public users:', publicUsers?.map(u => u.email) || []);

console.log('\n⚠️  You need to run this SQL in Supabase SQL Editor:\n');
console.log(`
-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, subscription_status, trial_ends_at, billing_period_end, cases_remaining, seats_count)
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

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`);

console.log('\n\nAfter running the SQL, manually fix the current user:');
if (authUsers.users.length > 0) {
  const user = authUsers.users[0];
  console.log(`
INSERT INTO public.users (id, email, subscription_status, trial_ends_at, billing_period_end, cases_remaining, seats_count)
VALUES (
  '${user.id}',
  '${user.email}',
  'trialing',
  NOW() + INTERVAL '14 days',
  NOW() + INTERVAL '14 days',
  50,
  3
)
ON CONFLICT (id) DO NOTHING;
  `);
}
