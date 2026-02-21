# Luma — Security Whitepaper

**Prepared for:** Hospital IT and Security Teams
**Date:** February 2026
**Version:** 1.0
**Contact:** hello@useluma.io

---

## Overview

This document summarizes the security architecture, controls, and certifications for the Luma platform. Luma is a Next.js 15 web application that generates medical necessity documentation for prior authorizations. It is deployed across a small set of third-party infrastructure providers, each evaluated for security posture before selection.

---

## Infrastructure and Hosting

| Layer | Provider | Certifications |
|---|---|---|
| Web application and serverless functions | Vercel | SOC 2 Type II, ISO 27001 |
| Database and authentication | Supabase (AWS-hosted) | SOC 2 Type II, HIPAA eligible |
| Document generation service | Railway | SOC 2 Type II |

**Vercel** serves the Next.js frontend and API routes. Static assets and serverless functions run on Vercel's edge and compute infrastructure. Vercel is SOC 2 Type II and ISO 27001 certified.

**Supabase** hosts the PostgreSQL database and manages user authentication. Supabase's infrastructure runs on AWS and holds SOC 2 Type II certification. Row Level Security (RLS) is enabled on all database tables, meaning access control is enforced at the database layer — not just the application layer.

**Railway** hosts a dedicated document generation microservice that handles the computationally intensive AI generation pipeline. Railway is SOC 2 Type II certified.

---

## Encryption

**Data at rest:** All data stored in Supabase PostgreSQL is encrypted using AES-256. This is managed by Supabase and inherited from AWS RDS encryption at the storage layer.

**Data in transit:** All connections between the user's browser, Vercel, Supabase, and external APIs use TLS. Supabase enforces TLS on all client connections. API calls to Perplexity and Google Gemini are made over HTTPS.

**Secrets management:** All API keys and secrets (Supabase service role key, Gemini API key, Perplexity API key, Stripe secret key, Resend API key) are stored as environment variables in Vercel and Railway. They are never embedded in client-side code and never committed to the repository. The Next.js build system enforces the `NEXT_PUBLIC_` prefix convention — only explicitly prefixed variables are exposed to the browser.

---

## Authentication and Access Control

**User authentication:** Authentication is handled by Supabase Auth using email-based login with magic links or email/password. Supabase Auth supports TOTP-based multi-factor authentication (authenticator apps).

**Session management:** Sessions are stored in server-side cookies managed by Supabase SSR. The `@supabase/ssr` library handles cookie lifecycle. Session tokens are not exposed in URLs or client-side storage.

**Row Level Security:** Every database table has RLS policies enabled. The core policy pattern is `auth.uid() = user_id`, which means the database itself rejects any query that attempts to access data belonging to a different user, regardless of application-layer logic. This is enforced at the PostgreSQL level.

**Multi-tenant isolation:** Each user's cases, documents, and account data are isolated by `user_id`. There is no shared data between accounts. Admin-only functions use a service role key that is strictly server-side and never exposed to client code.

**API authentication:** The Railway generation service validates every inbound request against Supabase Auth using `supabase.auth.getUser()` (not `getSession()`, which would allow token spoofing). Requests without a valid Bearer token are rejected with 401.

---

## Rate Limiting

All AI generation endpoints are rate-limited. The generation API enforces a limit of 10 requests per 60-second window per authenticated user (falling back to IP-based limiting for unauthenticated requests). Rate limit headers (`Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are returned on 429 responses.

---

## Monitoring and Logging

**Error tracking:** Sentry is integrated across server, client, and edge runtime contexts. The Sentry configuration explicitly strips sensitive data before sending error events:

- Authorization headers are removed
- Cookie headers are removed
- Stripe signature headers are removed
- Token and API key query parameters are filtered

Sentry events are not sent in development environments. The Sentry tunnel route (`/monitoring`) prevents ad-blockers from interfering with error capture.

**Audit logging:** All significant user actions are written to an `audit_logs` table in Supabase. Each log entry captures: user ID, action type, resource type, resource ID, metadata, IP address (from `x-forwarded-for`), and user agent. Audit logs are written using the service role client, which bypasses RLS, ensuring they cannot be tampered with by regular users.

**Webhook security:** Stripe webhooks use signature verification via `STRIPE_WEBHOOK_SECRET`. The webhook route is excluded from the session middleware matcher to preserve raw request body integrity required for signature validation.

---

## PHI Handling and AI API Calls

Luma uses a patient name placeholder strategy to prevent PHI from leaving the system boundary during AI processing:

1. When a document generation request is initiated, the patient's name is replaced with the token `[PATIENT]` before any prompt is constructed.
2. All calls to Perplexity (research phase) and Google Gemini (generation phase) use this placeholder — the patient name is never included in any external API request.
3. After generation completes, the `[PATIENT]` token is replaced with the actual patient name locally, within the generation service, before the document is saved to the database.

This is enforced in `phi-utils.ts` (shared between the Next.js app and the Railway generation service), which provides the `PATIENT_PLACEHOLDER` constant, `computeAgeTags()` (converts raw age to age group classification), and `reinsertPatientName()` (post-generation name re-insertion).

---

## Data Residency

- **Supabase:** Hosted on AWS. Luma's Supabase project is provisioned in the US East (us-east-1) region.
- **Vercel:** US-based serverless compute and edge network.
- **Railway:** US region deployment.

All data is stored and processed within United States infrastructure.

---

## Subprocessors

A complete list of subprocessors is maintained in `SUBPROCESSORS.md` in this directory.

---

## Vulnerability Disclosure

To report a security vulnerability, contact: **hello@useluma.io**

Please include a description of the issue, reproduction steps, and any relevant request/response details. We target a response within 48 business hours.

---

## Document Control

This whitepaper reflects the Luma production architecture as of February 2026. It will be updated when material changes to the security architecture occur.
