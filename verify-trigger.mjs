import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Checking if trigger exists in production database...\n');

// Try to query pg_trigger to see if our trigger exists
const { data, error } = await supabase
  .rpc('exec_sql', {
    query: `
      SELECT
        t.tgname as trigger_name,
        p.proname as function_name
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE t.tgname = 'on_auth_user_created';
    `
  });

if (error) {
  console.log('Cannot query triggers directly. Trying alternative method...\n');

  // Alternative: Create a test to see if trigger works
  console.log('Testing trigger by checking function existence...');

  const { data: funcData, error: funcError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_name = 'handle_new_user'
        AND routine_schema = 'public';
      `
    });

  if (funcError) {
    console.log('⚠️  Cannot verify - you may need to check Supabase SQL Editor');
    console.log('Error:', funcError.message);
  }
} else {
  console.log('Trigger found:', data);
}

console.log('\n✅ If you ran the SQL in Supabase SQL Editor and it succeeded,');
console.log('   the trigger is active and will work when you sign up.');
console.log('\nYou can now test by signing up with a new account on production!');
