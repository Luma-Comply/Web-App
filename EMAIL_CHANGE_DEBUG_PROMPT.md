# Email Change Issue - Debug Prompt for LLM

## Problem Statement

When a user changes their email address in the profile settings, they are still receiving a "Confirm change of email" email with a confirmation link, instead of the email changing immediately without requiring confirmation.

**Expected Behavior:**
- User changes email in profile settings
- Email updates immediately in both `auth.users` and `public.users` tables
- No confirmation link required
- User receives a notification email (not a confirmation email)

**Actual Behavior:**
- User changes email in profile settings
- User receives "Confirm change of email" email with a confirmation link
- Email does NOT change until the link is clicked
- This is the wrong template/flow

## What We've Already Done

### 1. Code Changes
- **File:** `src/app/(dashboard)/settings/profile/page.tsx`
  - Updated `handleSaveProfile()` function to:
    - Update email via `supabase.auth.updateUser({ email: newEmail })`
    - Update `public.users` table with new email
    - Set `emailRedirectTo` option for email change confirmations
  - The code attempts to update both auth and database tables

### 2. Supabase Configuration Attempt
- **Script Created:** `scripts/disable-secure-email-change.ts`
- **Attempted Action:** Used Supabase Management API to disable "Secure Email Change"
- **API Endpoint Used:** `PATCH /v1/projects/{project_ref}/config/auth`
- **Payload:** `{ mailer_secure_email_change_enabled: false }`
- **Result:** Script reported success (setting changed from `true` to `false`)
- **Verification:** Ran `scripts/check-secure-email-change.ts` - confirmed setting is `false` (DISABLED)
- **Issue:** Despite setting being disabled, users still receive confirmation emails and email doesn't change immediately

### 3. Supabase Project Details
- **Project Ref:** `mwmiglyufccnvlobtkhi`
- **Project URL:** `https://mwmiglyufccnvlobtkhi.supabase.co`
- **MCP Server Available:** `https://mcp.supabase.com/mcp?project_ref=mwmiglyufccnvlobtkhi`

## Current Code Implementation

### Profile Update Function (`src/app/(dashboard)/settings/profile/page.tsx`)

```typescript
async function handleSaveProfile() {
  setSaving(true)
  try {
    const emailChanged = email !== originalEmail
    
    const updateData: any = {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    }

    if (emailChanged) {
      updateData.email = email
      updateData.options = {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback?type=email_change&next=/settings/profile`,
      }
    }

    const { data: updateResponse, error: updateError } = await supabase.auth.updateUser(updateData)

    if (updateError) throw updateError

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error("User not found")
    }

    // Update public.users table with new email
    const { error: dbError } = await supabase
      .from('users')
      .update({
        email: user.email || email,
      })
      .eq('id', user.id)

    // ... rest of the function
  }
}
```

## Key Questions to Investigate

1. **Is "Secure Email Change" actually disabled in Supabase?**
   - ✅ **VERIFIED:** Setting is confirmed disabled (`mailer_secure_email_change_enabled: false`)
   - ❓ **MYSTERY:** Why is Supabase still sending confirmation emails if the setting is disabled?
   - ❓ Could there be a different setting or configuration affecting this?

2. **Are there other Supabase settings affecting this?**
   - "Confirm Email" setting (for signups - should be separate)
   - Email template settings
   - Auth provider settings

3. **Is the Supabase Management API endpoint correct?**
   - Verify the correct API endpoint for disabling secure email change
   - Check if the setting name is correct (`mailer_secure_email_change_enabled`)
   - Verify authentication token permissions

4. **Is there a caching issue?**
   - Supabase might be caching the old setting
   - Need to verify the setting was actually changed

5. **Are we using the correct Supabase client?**
   - Client-side vs server-side client
   - Service role key vs anon key

## Files to Review

1. `src/app/(dashboard)/settings/profile/page.tsx` - Profile update logic
2. `src/lib/supabase/client.ts` - Supabase client configuration
3. `src/lib/supabase/server.ts` - Server-side Supabase client
4. `scripts/disable-secure-email-change.ts` - Script that attempted to disable the setting
5. `src/app/auth/callback/route.ts` - Handles email change confirmations

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-only)
- `SUPABASE_ACCESS_TOKEN` - Management API token (for config changes)
- `NEXT_PUBLIC_APP_URL` - Application URL

## What We Need

1. **Verify the actual Supabase setting** - Check if "Secure Email Change" is truly disabled
2. **Find the correct way to disable it** - Either via Dashboard or correct API endpoint
3. **Fix the code if needed** - Ensure email changes happen immediately
4. **Test the flow** - Confirm email changes work without confirmation link

## Additional Context

- This is a Next.js 15 application
- Using Supabase Auth with email provider
- Using `@supabase/ssr` and `@supabase/supabase-js` packages
- The password change flow works correctly (requires old password, updates immediately)
- We want email changes to work the same way (verify old email, update immediately)

## Success Criteria

When a user changes their email:
1. ✅ Email updates immediately in `auth.users.email`
2. ✅ Email updates immediately in `public.users.email`
3. ✅ No confirmation link required
4. ✅ User receives notification email (not confirmation email)
5. ✅ Uses the correct email template (the "black UI" template, not the default confirmation template)

---

**Please help debug why the "Secure Email Change" setting isn't being respected, or find the correct way to make email changes immediate without requiring confirmation.**
