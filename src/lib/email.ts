// Email service for sending team invitations

import { Resend } from 'resend'

export interface SendInvitationEmailParams {
  to: string
  inviterEmail: string
  practiceName: string
  invitationLink: string
}

export async function sendInvitationEmail({
  to,
  inviterEmail,
  practiceName,
  invitationLink,
}: SendInvitationEmailParams) {
  const fromEmail = 'Luma <noreply@useluma.io>'

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Email invitation skipped.')
    console.log(`Invitation link for ${to}: ${invitationLink}`)
    return { success: false, error: 'Missing API Key' }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `You've been invited to join ${practiceName} on Luma`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Team Invitation</title>
</head>
<body style="background-color: #f8fafc; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; text-align: center;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: left;">

    <h2 style="margin-top: 0; font-size: 24px; font-weight: 600; color: #1e293b; margin-bottom: 24px;">You've been invited to join ${practiceName}!</h2>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
      <strong style="color: #1e293b;">${practiceName}</strong> has invited you to join their team on Luma.
    </p>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Luma helps healthcare providers generate compliant medical necessity documentation in seconds, not hours.
    </p>

    <a href="${invitationLink}"
       style="display: inline-block; background-color: #1A2749; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">
      Accept Invitation
    </a>

    <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin-top: 32px;">
      This invitation will expire in 7 days. If you have any questions, contact us at <a href="mailto:hello@useluma.io" style="color: #1652C5; text-decoration: none; font-weight: 500;">hello@useluma.io</a>.
    </p>

    <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 16px;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Luma Health. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Resend invitation error:', JSON.stringify(error))
      return { success: false, error }
    }

    console.log('Resend invitation success:', JSON.stringify(data))
    return { success: true, data }
  } catch (error) {
    console.error('Exception sending invitation email:', error)
    return { success: false, error }
  }
}
