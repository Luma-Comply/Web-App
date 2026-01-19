import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Checking current RLS policies...\n');

// Query the policies table directly
const { data, error } = await supabase
  .from('pg_policies')
  .select('*')
  .eq('tablename', 'users');

if (error) {
  console.log('Cannot query pg_policies directly. Trying alternative...\n');

  // Try to see what's in the authentication policies page
  console.log('Go to Supabase Dashboard → Authentication → Policies');
  console.log('URL: https://supabase.com/dashboard/project/mwmiglyufccnvlobtkhi/auth/policies');
  console.log('\nLook for the "Users can insert via trigger" policy.');
  console.log('Check if the WITH CHECK condition says "true" or something else.');
} else {
  console.log('Current policies on users table:');
  data.forEach(policy => {
    console.log('\nPolicy:', policy.policyname);
    console.log('  Command:', policy.cmd);
    console.log('  Using:', policy.qual);
    console.log('  With Check:', policy.with_check);
  });
}
