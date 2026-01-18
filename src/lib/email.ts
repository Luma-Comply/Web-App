// Email service for sending team invitations
// Using console.log for development, replace with actual email service in production

export interface SendInvitationEmailParams {
  to: string
  inviterEmail: string
  invitationLink: string
}

export async function sendInvitationEmail({
  to,
  inviterEmail,
  invitationLink,
}: SendInvitationEmailParams) {
  // For development, we'll just log the email
  // In production, replace this with your email service (Resend, SendGrid, etc.)

  console.log(`
==============================================
📧 TEAM INVITATION EMAIL
==============================================
To: ${to}
From: noreply@useluma.io
Subject: You've been invited to join Luma

Hi there,

${inviterEmail} has invited you to join their team on Luma.

Click the link below to accept the invitation:
${invitationLink}

This invitation will expire in 7 days.

Best regards,
The Luma Team
==============================================
  `)

  // TODO: Replace with actual email service
  /*
  // Example with Resend:
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: 'Luma <noreply@useluma.io>',
    to: [to],
    subject: "You've been invited to join Luma",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>You've been invited!</h1>
        <p>${inviterEmail} has invited you to join their team on Luma.</p>
        <a href="${invitationLink}"
           style="display: inline-block; background-color: #2D3B45; color: white;
                  padding: 12px 24px; text-decoration: none; border-radius: 6px;
                  margin: 20px 0;">
          Accept Invitation
        </a>
        <p style="color: #666; font-size: 14px;">
          This invitation will expire in 7 days.
        </p>
      </div>
    `,
  })
  */

  return { success: true }
}
