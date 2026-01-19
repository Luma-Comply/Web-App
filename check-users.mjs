import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Checking auth.users...\n');
const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

if (authError) {
  console.log('Error listing auth users:', authError);
} else {
  console.log(`Found ${authUsers.users.length} users in auth.users:`);
  authUsers.users.forEach(user => {
    console.log(`  - ${user.email} (ID: ${user.id}, Confirmed: ${!!user.email_confirmed_at})`);
  });
}

console.log('\n\nChecking public.users...\n');
const { data: publicUsers, error: publicError } = await supabase
  .from('users')
  .select('id, email, created_at');

if (publicError) {
  console.log('Error listing public users:', publicError);
} else {
  console.log(`Found ${publicUsers.length} users in public.users:`);
  publicUsers.forEach(user => {
    console.log(`  - ${user.email} (ID: ${user.id})`);
  });
}

// Compare
console.log('\n\nComparison:');
if (authUsers && publicUsers) {
  const authIds = new Set(authUsers.users.map(u => u.id));
  const publicIds = new Set(publicUsers.map(u => u.id));

  const missingInPublic = authUsers.users.filter(u => !publicIds.has(u.id));
  const missingInAuth = publicUsers.filter(u => !authIds.has(u.id));

  if (missingInPublic.length > 0) {
    console.log('\n❌ Users in auth.users but NOT in public.users:');
    missingInPublic.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`));
  } else {
    console.log('✅ All auth users exist in public.users');
  }

  if (missingInAuth.length > 0) {
    console.log('\n⚠️  Users in public.users but NOT in auth.users:');
    missingInAuth.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`));
  }
}
