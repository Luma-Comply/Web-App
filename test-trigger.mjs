import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Testing trigger by creating a test user...\n');

// Create a test user
const testEmail = `test-${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';

console.log(`Creating user: ${testEmail}`);

const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email: testEmail,
  password: testPassword,
  email_confirm: true
});

if (authError) {
  console.log('❌ Failed to create auth user:', authError.message);
  process.exit(1);
}

console.log('✅ Created auth user:', authData.user.id);

// Wait a moment for trigger to fire
await new Promise(resolve => setTimeout(resolve, 2000));

// Check if public.users was created
const { data: publicUser, error: publicError } = await supabase
  .from('users')
  .select('*')
  .eq('id', authData.user.id)
  .single();

if (publicError || !publicUser) {
  console.log('❌ TRIGGER DID NOT FIRE - User not found in public.users');
  console.log('Error:', publicError?.message);
  console.log('\nYou need to run this SQL in Supabase SQL Editor:');
  console.log(`
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, email, subscription_status, trial_ends_at,
    billing_period_end, cases_remaining, seats_count
  )
  VALUES (
    NEW.id, NEW.email, 'trialing',
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '14 days', 50, 3
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  `);
} else {
  console.log('✅ TRIGGER WORKS! User found in public.users');
  console.log('User data:', publicUser);
}

// Clean up test user
console.log('\nCleaning up test user...');
await supabase.auth.admin.deleteUser(authData.user.id);
console.log('✅ Test user deleted');
