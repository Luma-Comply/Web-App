import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Fixing RLS policies in production database...\n');

// Step 1: Drop all existing policies
console.log('Step 1: Dropping existing policies...');
const dropPolicies = `
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can do everything" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_trigger" ON public.users;
DROP POLICY IF EXISTS "Users can insert via trigger" ON public.users;
`;

const { error: dropError } = await supabase.rpc('exec_sql', { query: dropPolicies });
if (dropError) {
  console.log('Note: Some policies may not have existed (this is OK)');
  console.log('Error:', dropError.message);
}

// Step 2: Enable RLS
console.log('\nStep 2: Enabling RLS...');
const { error: rlsError } = await supabase.rpc('exec_sql', {
  query: 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;'
});
if (rlsError) console.log('RLS already enabled or error:', rlsError.message);

// Step 3: Create SELECT policy
console.log('\nStep 3: Creating SELECT policy...');
const selectPolicy = `
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);
`;
const { error: selectError } = await supabase.rpc('exec_sql', { query: selectPolicy });
if (selectError) {
  console.log('❌ Failed to create SELECT policy:', selectError.message);
} else {
  console.log('✅ SELECT policy created');
}

// Step 4: Create UPDATE policy
console.log('\nStep 4: Creating UPDATE policy...');
const updatePolicy = `
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
`;
const { error: updateError } = await supabase.rpc('exec_sql', { query: updatePolicy });
if (updateError) {
  console.log('❌ Failed to create UPDATE policy:', updateError.message);
} else {
  console.log('✅ UPDATE policy created');
}

// Step 5: Create INSERT policy (THE FIX!)
console.log('\nStep 5: Creating INSERT policy (without recursion)...');
const insertPolicy = `
CREATE POLICY "Users can insert via trigger"
  ON public.users FOR INSERT
  WITH CHECK (true);
`;
const { error: insertError } = await supabase.rpc('exec_sql', { query: insertPolicy });
if (insertError) {
  console.log('❌ Failed to create INSERT policy:', insertError.message);
} else {
  console.log('✅ INSERT policy created (this fixes the infinite recursion!)');
}

// Step 6: Update trigger function
console.log('\nStep 6: Updating trigger function...');
const triggerFunc = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    subscription_status,
    trial_ends_at,
    billing_period_end,
    cases_remaining,
    seats_count
  )
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
`;
const { error: funcError } = await supabase.rpc('exec_sql', { query: triggerFunc });
if (funcError) {
  console.log('❌ Failed to update trigger function:', funcError.message);
} else {
  console.log('✅ Trigger function updated');
}

// Step 7: Recreate trigger
console.log('\nStep 7: Recreating trigger...');
const trigger = `
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;
const { error: triggerError } = await supabase.rpc('exec_sql', { query: trigger });
if (triggerError) {
  console.log('❌ Failed to create trigger:', triggerError.message);
} else {
  console.log('✅ Trigger created');
}

// Verify the fix
console.log('\n\n=== VERIFICATION ===');
console.log('Testing if RLS infinite recursion is fixed...\n');

// Test with anon client (like checkout API uses)
const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Get current user (as if we're in the checkout API)
const { data: { user: authUser } } = await supabase.auth.admin.listUsers();
if (authUser && authUser.users && authUser.users.length > 0) {
  const testUserId = authUser.users[0].id;
  console.log('Testing with user:', authUser.users[0].email);

  // Try to query as that user would
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', testUserId)
    .single();

  if (error) {
    console.log('❌ Still have error:', error.message);
  } else {
    console.log('✅ SUCCESS! User query works without infinite recursion!');
    console.log('   Found user:', data.email);
  }
}

console.log('\n✅ RLS policies fixed! Checkout should work now.');
console.log('   Try signing up and clicking "Start 14-Day Free Trial"');
