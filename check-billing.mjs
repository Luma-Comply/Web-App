import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('users')
  .select('id, email, subscription_status, stripe_subscription_id, trial_ends_at, cancel_at_period_end, cases_remaining, seats_count, billing_period_end')
  .limit(5);

if (error) {
  console.log('Error:', error.message);
} else {
  console.log('Users billing data:');
  console.log(JSON.stringify(data, null, 2));
}
