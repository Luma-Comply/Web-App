#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Read the migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/003_add_team_members.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📦 Applying database migration...\n');

// Apply the migration using Supabase REST API
fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({ query: migrationSQL })
})
.then(response => {
  if (!response.ok) {
    return response.text().then(text => {
      throw new Error(`HTTP ${response.status}: ${text}`);
    });
  }
  return response.json();
})
.then(data => {
  console.log('✅ Migration applied successfully!\n');
  console.log('Database changes:');
  console.log('  • Added is_team_owner and team_owner_id to users table');
  console.log('  • Created team_invitations table');
  console.log('  • Added RLS policies for team access');
  console.log('  • Created helper functions for team management\n');
  console.log('🎉 You can now test the team features!');
})
.catch(error => {
  console.error('❌ Migration failed:', error.message);
  console.log('\n💡 Trying alternative method using SQL Editor endpoint...\n');

  // Try alternative approach: direct SQL execution
  return fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: migrationSQL })
  });
})
.catch(finalError => {
  console.error('\n❌ Could not apply migration automatically.');
  console.log('\n📋 Please apply manually:');
  console.log('1. Go to: https://supabase.com/dashboard/project/mwmiglyufccnvlobtkhi/sql/new');
  console.log('2. Copy contents of: supabase/migrations/003_add_team_members.sql');
  console.log('3. Paste and click Run\n');
  process.exit(1);
});
