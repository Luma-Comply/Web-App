import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('⚠️  WARNING: This will delete ALL users from your database!\n');

// Get all auth users
const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

if (authError) {
  console.log('Error listing users:', authError);
  process.exit(1);
}

console.log(`Found ${authUsers.users.length} users to delete:\n`);
authUsers.users.forEach(user => {
  console.log(`  - ${user.email} (${user.id})`);
});

console.log('\nDeleting users...\n');

let deletedCount = 0;
let failedCount = 0;

for (const user of authUsers.users) {
  // Delete from auth.users (this should cascade and trigger deletion in public.users)
  const { error } = await supabase.auth.admin.deleteUser(user.id);

  if (error) {
    console.log(`❌ Failed to delete ${user.email}: ${error.message}`);
    failedCount++;
  } else {
    console.log(`✅ Deleted ${user.email}`);
    deletedCount++;
  }
}

// Also clean up any orphaned records in public.users
console.log('\nCleaning up public.users table...');
const { error: cleanupError } = await supabase
  .from('users')
  .delete()
  .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a dummy condition)

if (cleanupError) {
  console.log('Error cleaning up public.users:', cleanupError.message);
} else {
  console.log('✅ Cleaned up public.users table');
}

console.log(`\n✅ Complete! Deleted ${deletedCount} users, ${failedCount} failed.`);
