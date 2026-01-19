import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Deleting all users from auth and public.users...\n');

// Get all auth users
const { data: authUsers } = await supabase.auth.admin.listUsers();
console.log(`Found ${authUsers.users.length} auth users`);

// Delete each user (this will cascade to public.users via foreign key)
for (const user of authUsers.users) {
  console.log(`Deleting ${user.email}...`);
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) {
    console.log(`  ❌ Error:`, error.message);
  } else {
    console.log(`  ✅ Deleted`);
  }
}

console.log('\n✅ All users deleted. Database is clean.');
console.log('Now you can test signup → checkout flow from scratch!');
