import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use environment variables - never hardcode secrets!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('📦 Applying database migration...\n');

// Read migration file
const migrationPath = join(__dirname, '../supabase/migrations/003_add_team_members.sql');
const migrationSQL = readFileSync(migrationPath, 'utf8');

// Execute each statement separately
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Found ${statements.length} SQL statements to execute\n`);

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];
  console.log(`[${i + 1}/${statements.length}] Executing...`);

  try {
    const { data, error } = await supabase.rpc('exec', { sql: statement + ';' });

    if (error) {
      console.log(`❌ Error:`, error.message);
      errorCount++;
    } else {
      console.log(`✅ Success`);
      successCount++;
    }
  } catch (err) {
    console.log(`❌ Exception:`, err.message);
    errorCount++;
  }
  console.log('');
}

console.log(`\n📊 Summary:`);
console.log(`   Success: ${successCount}`);
console.log(`   Errors: ${errorCount}`);

if (errorCount > 0) {
  console.log('\n❌ Migration had errors. Please apply manually via Supabase Dashboard.');
  process.exit(1);
} else {
  console.log('\n✅ Migration completed successfully!');
}
