import { NextRequest, NextResponse } from 'next/server';
import { resend } from '@/lib/resend/client';
import { z } from 'zod';

// Validation Schema
const feedbackSchema = z.object({
    type: z.enum(['bug', 'feature', 'general']),
    description: z.string().min(1, "Description is required"),
    userEmail: z.string().email().optional(),
    userId: z.string().optional(),
    userName: z.string().optional(),
    path: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = feedbackSchema.safeParse(body);
        
        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: result.error },
                { status: 400 }
            );
        }

        const { type, description, userEmail, userId, userName, path } = result.data;

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const GITHUB_OWNER = process.env.GITHUB_OWNER;
        const GITHUB_REPO = process.env.GITHUB_REPO;

        // 1. Send Email via Resend
        const emailSubject = `[${type.toUpperCase()}] New Feedback from ${userName || 'User'}`;
        
        try {
            await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'Feedback <system@yourdomain.com>',
                to: process.env.RESEND_TO_EMAIL || 'support@yourdomain.com',
                subject: emailSubject,
                html: `
          <h2>New Feedback Received</h2>
          <p><strong>Type:</strong> ${type}</p>
          <p><strong>User:</strong> ${userName || 'Anonymous'} ${userEmail ? `(${userEmail})` : ''}</p>
          <p><strong>Page:</strong> ${path || 'Unknown'}</p>
          ${userId ? `<p><strong>User ID:</strong> ${userId}</p>` : ''}
          <hr />
          <h3>Description</h3>
          <p style="white-space: pre-wrap;">${description}</p>
        `,
                replyTo: userEmail,
            });
        } catch (emailError) {
            console.error('Failed to send feedback email:', emailError);
        }

        // 2. Create GitHub Issue
        let issueUrl = null;
        if (GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO) {
            const labelMap: Record<string, string> = {
                'bug': 'bug',
                'feature': 'enhancement',
                'general': 'documentation' 
            };

            const issueBody = `
**Type**: ${type}
**User**: ${userName || 'Anonymous'} ${userEmail ? `(${userEmail})` : ''}
**Page**: ${path || 'Unknown'}
${userId ? `**User ID**: ${userId}` : ''}

### Description
${description}
      `;

            try {
                const ghRes = await fetch(
                    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `token ${GITHUB_TOKEN}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            title: `[Feedback] ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`,
                            body: issueBody,
                            labels: [labelMap[type] || 'feedback'],
                        }),
                    }
                );

                if (ghRes.ok) {
                    const ghData = await ghRes.json();
                    issueUrl = ghData.html_url;
                }
            } catch (ghError) {
                console.error('Failed to create GitHub issue:', ghError);
            }
        }

        return NextResponse.json({ success: true, issueUrl });
    } catch (error) {
        console.error('Feedback API error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
