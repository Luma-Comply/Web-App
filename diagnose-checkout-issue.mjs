#!/usr/bin/env node

/**
 * Diagnostic script to check checkout flow and RLS policies
 *
 * This script will:
 * 1. Verify the trigger exists and is active
 * 2. Check all RLS policies on the users table
 * 3. Test if a user record exists after auth signup
 * 4. Identify any timing or policy conflicts
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔍 Checking Checkout Flow & RLS Policies\n');

// Check 1: Verify trigger exists
console.log('1️⃣ Checking if trigger exists...');
try {
  const { data: triggers, error } = await supabase
    .rpc('get_triggers')
    .single();

  if (error) {
    console.log('⚠️  Cannot query triggers directly (expected - need custom function)');
    console.log('   Trigger should exist based on schema.sql');
  }
} catch (err) {
  console.log('⚠️  Cannot query triggers (need to check manually in Supabase Dashboard)');
}

// Check 2: Query RLS policies
console.log('\n2️⃣ Checking RLS policies on users table...');
try {
  const { data: policies, error } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'users');

  if (error) {
    console.log('⚠️  Cannot query pg_policies (need elevated permissions)');
    console.log('   Expected policies from schema.sql:');
    console.log('   - "Users can view own profile" (SELECT)');
    console.log('   - "Users can update own profile" (UPDATE)');
    console.log('   - "Users can insert via trigger" (INSERT, WITH CHECK = true)');
  } else {
    console.log('✅ RLS Policies found:');
    policies.forEach(policy => {
      console.log(`   - ${policy.policyname}: ${policy.cmd}`);
      if (policy.with_check) {
        console.log(`     WITH CHECK: ${policy.with_check}`);
      }
    });
  }
} catch (err) {
  console.log('⚠️  Cannot query pg_policies:', err.message);
}

// Check 3: Count users in auth.users vs public.users
console.log('\n3️⃣ Checking user count consistency...');
try {
  // Count auth users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.log('❌ Error listing auth users:', authError.message);
  } else {
    console.log(`   Auth users (auth.users): ${authUsers.users.length}`);

    // Count public users
    const { count: publicCount, error: publicError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (publicError) {
      console.log('❌ Error counting public users:', publicError.message);
    } else {
      console.log(`   Public users (public.users): ${publicCount}`);

      if (authUsers.users.length !== publicCount) {
        console.log('⚠️  MISMATCH! Some auth users are missing from public.users');
        console.log('   This indicates the trigger may not be firing correctly.');

        // Find which users are missing
        const { data: publicUsers } = await supabase
          .from('users')
          .select('id');

        const publicIds = new Set(publicUsers?.map(u => u.id) || []);
        const missingUsers = authUsers.users.filter(u => !publicIds.has(u.id));

        if (missingUsers.length > 0) {
          console.log('\n   Missing users:');
          missingUsers.forEach(u => {
            console.log(`   - ${u.email} (${u.id})`);
            console.log(`     Created: ${u.created_at}`);
          });
        }
      } else {
        console.log('✅ User counts match!');
      }
    }
  }
} catch (err) {
  console.log('❌ Error checking users:', err.message);
}

// Check 4: Test user lookup with service role
console.log('\n4️⃣ Testing user lookup with service role...');
try {
  const { data: authUsers } = await supabase.auth.admin.listUsers();

  if (authUsers && authUsers.users.length > 0) {
    const testUser = authUsers.users[0];
    console.log(`   Testing lookup for: ${testUser.email}`);

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUser.id)
      .single();

    if (error) {
      console.log('❌ User lookup failed:', error.message);
      console.log('   This would cause checkout to fail!');
    } else if (user) {
      console.log('✅ User lookup successful');
      console.log(`   User: ${user.email}`);
      console.log(`   Subscription status: ${user.subscription_status}`);
    }
  } else {
    console.log('⚠️  No users in database to test');
  }
} catch (err) {
  console.log('❌ Error testing user lookup:', err.message);
}

// Summary
console.log('\n📊 Summary:');
console.log('   The retry mechanism added to the checkout API should handle');
console.log('   timing issues if the trigger is slow to create public.users records.');
console.log('\n   If issues persist, check Supabase Dashboard:');
console.log('   1. Database → Functions → verify handle_new_user() exists');
console.log('   2. Database → Triggers → verify on_auth_user_created exists');
console.log('   3. Authentication → Policies → verify RLS policies on users table');
console.log('\n   Or run this SQL in Supabase SQL Editor to check for duplicate policies:');
console.log('   SELECT policyname, cmd, permissive, with_check');
console.log('   FROM pg_policies');
console.log('   WHERE tablename = \'users\';');
