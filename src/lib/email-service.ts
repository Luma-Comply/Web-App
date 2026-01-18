
import { resend } from '@/lib/resend/client';

export interface EmailChangeNotificationParams {
    to: string;
    oldEmail: string;
    newEmail: string;
}

export async function sendEmailChangeNotification({
    to,
    oldEmail,
    newEmail,
}: EmailChangeNotificationParams) {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Luma <noreply@useluma.io>';

    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is not set. Email notification skipped.');
        return { success: false, error: 'Missing API Key' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [to],
            subject: 'Your email address has been changed',
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Changed</title>
</head>
<body style="background-color: #1a1a1a; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; text-align: center;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #262626; border-radius: 8px; padding: 40px; border: 1px solid #333333; text-align: left;">
    <h2 style="margin-top: 0; font-size: 24px; font-weight: 500; color: #ffffff; margin-bottom: 24px;">Your email address has been changed</h2>
    
    <p style="color: #cccccc; font-size: 16px; line-height: 1.5; margin-bottom: 16px;">
      The email address for your account has been changed from <strong style="color: #ffffff;">${oldEmail}</strong> to <strong style="color: #ffffff;">${newEmail}</strong>.
    </p>
    
    <p style="color: #999999; font-size: 14px; line-height: 1.5; margin-top: 32px;">
      If you did not make this change, please contact support at <a href="mailto:hello@useluma.io" style="color: #3b82f6; text-decoration: none;">hello@useluma.io</a> immediately.
    </p>
    
    <div style="border-top: 1px solid #333333; margin-top: 32px; padding-top: 16px;">
      <p style="color: #666666; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Luma. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
      `,
        });

        if (error) {
            console.error('Error sending email change notification:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Exception sending email change notification:', error);
        return { success: false, error };
    }
}
