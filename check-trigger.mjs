import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Check if trigger and function exist
const { data: functions, error: funcError } = await supabase
  .rpc('pg_get_functiondef', { funcoid: 'public.handle_new_user'::regproc })
  .single();

if (funcError) {
  console.log('Function check error:', funcError.message);
} else {
  console.log('Function exists:', functions);
}

// Check for triggers
const query = `
  SELECT
    trigger_name,
    event_object_table,
    action_statement
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_created';
`;

const { data: triggers, error: trigError } = await supabase.rpc('exec_sql', { sql: query });

if (trigError) {
  console.log('Trigger check error:', trigError.message);
  console.log('Trying alternative method...');

  // Alternative: just try to create a test user and see if it works
  console.log('\nChecking auth.users table structure...');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.log('Error listing users:', authError);
  } else {
    console.log('Total auth users:', authUsers.users.length);
    console.log('First user:', authUsers.users[0]?.email);
  }
} else {
  console.log('Triggers:', triggers);
}
