# Database Migration Instructions

To complete the setup for team management features, you need to apply the database migration manually.

## Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `mwmiglyufccnvlobtkhi`
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy and paste the entire contents of `supabase/migrations/003_add_team_members.sql`
6. Click "Run" to execute the migration

## What the migration adds:

- **Team ownership tracking** - `is_team_owner` and `team_owner_id` columns in users table
- **Team invitations table** - For managing pending invitations
- **RLS policies** - Secure access to team data
- **Helper functions** - For accepting invitations and counting team members

## After migration:

All the features will be ready to test:
- Profile management (personal info & password)
- Team member invitations
- Team member management
- Billing page with subscription details
- Subscription cancellation

## Testing:

1. Start the dev server: `npm run dev`
2. Login to your account
3. Click on your email in the header to access the dropdown
4. Navigate to Profile, Team, and Billing sections
