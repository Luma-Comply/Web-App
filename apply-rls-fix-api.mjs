import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Extract project ref from URL (e.g., https://mwmiglyufccnvlobtkhi.supabase.co -> mwmiglyufccnvlobtkhi)
const PROJECT_REF = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

console.log('Fixing RLS policies in production database...');
console.log('Project:', PROJECT_REF);
console.log('');

// The SQL to run
const sql = `
-- Drop all existing policies
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

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create correct policies
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert via trigger"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- Update trigger function
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

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;

try {
  // Use the REST API to run SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    console.log('❌ API response not OK');
    console.log('Status:', response.status, response.statusText);
    const text = await response.text();
    console.log('Response:', text);

    console.log('\n⚠️  Cannot run SQL via API. You need to run this SQL in Supabase SQL Editor:');
    console.log('\nGo to: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
    console.log('\nOr copy from: fix-rls-production.sql');
  } else {
    const data = await response.json();
    console.log('✅ SQL executed successfully!');
    console.log('Result:', data);
  }
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('\n⚠️  Cannot run SQL via script. You need to run this SQL in Supabase SQL Editor:');
  console.log('\nGo to: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
  console.log('\nCopy the SQL from: fix-rls-production.sql');
}
