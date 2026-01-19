import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Create admin client (bypasses RLS)
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create regular client (subject to RLS)
const regularClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('Checking RLS policies...\n');

// Get all users with admin client
const { data: adminUsers } = await adminClient
  .from('users')
  .select('id, email');

console.log('Users visible to admin client (bypasses RLS):', adminUsers?.length || 0);
if (adminUsers && adminUsers.length > 0) {
  console.log('  -', adminUsers[0].email, '(', adminUsers[0].id, ')');
}

// Try to get users with regular client (subject to RLS)
const { data: anonUsers, error: anonError } = await regularClient
  .from('users')
  .select('id, email');

console.log('\nUsers visible to anon client (with RLS):', anonUsers?.length || 0);
if (anonError) {
  console.log('ERROR:', anonError.message);
}

console.log('\n⚠️  The issue is likely RLS blocking the server-side query!');
console.log('The checkout API creates a server client, which might be subject to RLS.');
console.log('\nCheck your RLS policies in Supabase Dashboard → Authentication → Policies');
