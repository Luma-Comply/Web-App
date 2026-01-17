import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// This script deletes the test user account and all associated data
// Run with: npx tsx scripts/delete-test-user.ts

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Update this email to match the user you want to delete
const TEST_EMAIL = 'edwardguillen@mac.com'; // Found in database

async function deleteTestUser() {
  console.log(`🗑️  Deleting user: ${TEST_EMAIL}...\n`);

  try {
    // Step 1: Find the user - try with different email formats
    let user = null;
    let findError = null;
    
    // Try exact match first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, stripe_customer_id, stripe_subscription_id')
      .eq('email', TEST_EMAIL)
      .single();
    
    if (!userError && userData) {
      user = userData;
    } else {
      // Try case-insensitive search
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, email, stripe_customer_id, stripe_subscription_id');
      
      if (allUsers) {
        user = allUsers.find(u => u.email?.toLowerCase() === TEST_EMAIL.toLowerCase());
      }
    }

    if (!user) {
      console.log('ℹ️  User not found in public.users table');
      console.log('   Searching for any users with similar email...');
      
      // List all users to help debug
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, email')
        .limit(10);
      
      if (allUsers && allUsers.length > 0) {
        console.log('   Found users:');
        allUsers.forEach(u => console.log(`     - ${u.email}`));
      }
    } else {
      console.log(`✓ Found user: ${user.id}`);
      
      // Step 2: Delete all cases for this user
      const { error: casesError } = await supabase
        .from('cases')
        .delete()
        .eq('user_id', user.id);

      if (casesError) {
        console.error('❌ Error deleting cases:', casesError.message);
      } else {
        console.log('✓ Deleted all cases');
      }

      // Step 3: Delete user from public.users
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (userError) {
        console.error('❌ Error deleting user:', userError.message);
      } else {
        console.log('✓ Deleted user from public.users');
      }
    }

    // Step 4: Delete from auth.users (requires admin access)
    const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers();
    
    if (authListError) {
      console.error('❌ Error listing auth users:', authListError.message);
      console.log('\n⚠️  You may need to delete the auth user manually from Supabase Dashboard');
    } else {
      const authUser = authUsers.users.find(u => u.email === TEST_EMAIL);
      
      if (authUser) {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(authUser.id);
        
        if (deleteAuthError) {
          console.error('❌ Error deleting auth user:', deleteAuthError.message);
          console.log('\n⚠️  You may need to delete the auth user manually from Supabase Dashboard');
        } else {
          console.log('✓ Deleted user from auth.users');
        }
      } else {
        console.log('ℹ️  User not found in auth.users');
      }
    }

    console.log('\n✅ Cleanup complete!');
    console.log(`\n📝 Note: If you had a Stripe customer/subscription, you may want to:`);
    console.log('   1. Cancel subscription in Stripe Dashboard (if active)');
    console.log('   2. Or delete the test customer in Stripe (optional)');
    console.log('\n🎉 You can now sign up again with the same email!');

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

deleteTestUser();
