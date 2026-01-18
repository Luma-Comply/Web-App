import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Script to disable "Secure Email Change" in Supabase
 * 
 * To use this script:
 * 1. Get your Supabase access token from: https://supabase.com/dashboard/account/tokens
 * 2. Set SUPABASE_ACCESS_TOKEN in your .env.local file
 * 3. Run: npx tsx scripts/disable-secure-email-change.ts
 */

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = 'mwmiglyufccnvlobtkhi'; // Your project ref

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Missing SUPABASE_ACCESS_TOKEN');
  console.error('   Get it from: https://supabase.com/dashboard/account/tokens');
  console.error('   Add it to .env.local as: SUPABASE_ACCESS_TOKEN=your-token');
  process.exit(1);
}

async function disableSecureEmailChange() {
  try {
    console.log('🔧 Disabling Secure Email Change in Supabase...\n');

    // Get current auth config
    const getResponse = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!getResponse.ok) {
      const error = await getResponse.text();
      throw new Error(`Failed to get config: ${getResponse.status} ${error}`);
    }

    const currentConfig = await getResponse.json();
    console.log('📋 Current secure email change setting:', currentConfig.mailer_secure_email_change_enabled);

    // Update config to disable secure email change
    const updateResponse = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mailer_secure_email_change_enabled: false,
        }),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Failed to update config: ${updateResponse.status} ${error}`);
    }

    const updatedConfig = await updateResponse.json();
    console.log('\n✅ Successfully disabled Secure Email Change!');
    console.log('📋 New setting:', updatedConfig.mailer_secure_email_change_enabled);
    console.log('\n🎉 Email changes will now happen immediately without confirmation.');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. You have a valid Supabase access token');
    console.error('   2. The token has permission to update project config');
    console.error('   3. Get token from: https://supabase.com/dashboard/account/tokens');
    process.exit(1);
  }
}

disableSecureEmailChange();
