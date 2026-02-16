
import { resend } from '@/lib/resend/client';

export async function sendNewSignupNotification({
  userEmail,
  practiceName,
}: {
  userEmail: string;
  practiceName?: string | null;
}) {
  const fromEmail = 'Luma <noreply@useluma.io>';
  const adminEmail = process.env.RESEND_TO_EMAIL || 'hello@useluma.io';

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Admin notification skipped.');
    return { success: false, error: 'Missing API Key' };
  }

  try {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [adminEmail],
      subject: `New signup: ${userEmail}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New User Signup</title>
</head>
<body style="background-color: #f8fafc; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; text-align: center;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: left;">

    <h2 style="margin-top: 0; font-size: 24px; font-weight: 600; color: #1e293b; margin-bottom: 24px;">New User Signed Up</h2>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="color: #64748b; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">Email</td>
        <td style="color: #1e293b; font-size: 14px; font-weight: 500; padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">${userEmail}</td>
      </tr>
      <tr>
        <td style="color: #64748b; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">Practice</td>
        <td style="color: #1e293b; font-size: 14px; font-weight: 500; padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">${practiceName || 'Not provided'}</td>
      </tr>
      <tr>
        <td style="color: #64748b; font-size: 14px; padding: 8px 0;">Time</td>
        <td style="color: #1e293b; font-size: 14px; font-weight: 500; padding: 8px 0; text-align: right;">${timestamp}</td>
      </tr>
    </table>

    <div style="border-top: 1px solid #e2e8f0; margin-top: 16px; padding-top: 16px;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Luma. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error('Error sending new signup notification:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception sending new signup notification:', error);
    return { success: false, error };
  }
}

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
  const fromEmail = 'Luma <noreply@useluma.io>';

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
<body style="background-color: #f8fafc; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; text-align: center;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: left;">

    <h2 style="margin-top: 0; font-size: 24px; font-weight: 600; color: #1e293b; margin-bottom: 24px;">Your email address has been changed</h2>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
      The email address for your Luma account has been changed from <strong style="color: #1e293b;">${oldEmail}</strong> to <strong style="color: #1e293b;">${newEmail}</strong>.
    </p>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      If you made this change, no further action is needed.
    </p>

    <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin-top: 32px;">
      If you did not make this change, please contact us immediately at <a href="mailto:hello@useluma.io" style="color: #1652C5; text-decoration: none; font-weight: 500;">hello@useluma.io</a>.
    </p>

    <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 16px;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
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

export async function sendPasswordChangeNotification({
  to,
  email,
}: {
  to: string;
  email: string;
}) {
  const fromEmail = 'Luma <noreply@useluma.io>';

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Email notification skipped.');
    return { success: false, error: 'Missing API Key' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: 'Your password has been changed',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Changed</title>
</head>
<body style="background-color: #f8fafc; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; text-align: center;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: left;">

    <h2 style="margin-top: 0; font-size: 24px; font-weight: 600; color: #1e293b; margin-bottom: 24px;">Your password has been changed</h2>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
      The password for your Luma account (<strong style="color: #1e293b;">${email}</strong>) has been successfully changed.
    </p>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      If you made this change, no further action is needed.
    </p>

    <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin-top: 32px;">
      If you did not make this change, please contact us immediately at <a href="mailto:hello@useluma.io" style="color: #1652C5; text-decoration: none; font-weight: 500;">hello@useluma.io</a>.
    </p>

    <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 16px;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Luma. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error('Error sending password change notification:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception sending password change notification:', error);
    return { success: false, error };
  }
}
