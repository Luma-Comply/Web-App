# Luma — Subprocessor List

**Last updated:** February 2026
**Contact:** hello@useluma.io

This document lists all third-party subprocessors used by Luma in the delivery of its service. A subprocessor is any third party that Luma engages to process data on behalf of its customers.

---

## Subprocessors

| Subprocessor | Headquarters | Purpose | Data Processed | Certifications |
|---|---|---|---|---|
| **Supabase** | San Francisco, CA | Database, authentication, session management | User account data, case records, generated documents, audit logs | SOC 2 Type II, HIPAA eligible |
| **Vercel** | San Francisco, CA | Web application hosting, serverless API functions | HTTP request data, session cookies, application logs | SOC 2 Type II, ISO 27001 |
| **Railway** | San Francisco, CA | Document generation microservice | Clinical data (in-memory during generation), case IDs | SOC 2 Type II |
| **Google (Gemini API)** | Mountain View, CA | AI document generation | De-identified clinical data (patient name replaced with placeholder; age sent as group classification only) | SOC 2 Type II, ISO 27001 |
| **Perplexity AI** | San Francisco, CA | Payer requirement research | Payer name, medication name, patient state, diagnosis codes, de-identified clinical notes excerpt (no patient name, no DOB, no MRN) | Enterprise API tier |
| **Stripe** | San Francisco, CA | Payment processing, subscription management | Billing information, payment card data | PCI DSS Level 1, SOC 2 Type II |
| **Resend** | San Francisco, CA | Transactional email delivery | Provider email addresses, email notification content | SOC 2 Type II |
| **Sentry** | San Francisco, CA | Error monitoring and performance tracking | Application error data, stack traces (authorization headers, cookies, and tokens are explicitly stripped before transmission) | SOC 2 Type II |

---

## Notes on AI Provider Data Handling

**Google Gemini:** Clinical data sent to Gemini during document generation never includes the patient's name (replaced with `[PATIENT]` placeholder), date of birth, SSN, MRN, or any of the 18 HIPAA identifiers beyond de-identified clinical notes. Age is converted to a group classification (pediatric / adult / geriatric) before transmission.

**Perplexity AI:** Perplexity is queried only for payer policy research. Queries include payer name, medication, state, diagnosis codes, and a clinical notes excerpt. Patient name is never included. Perplexity does not receive any data that constitutes PHI under HIPAA Safe Harbor rules.

---

## Changes to This List

Luma will provide reasonable advance notice of any material changes to this subprocessor list. To receive notifications, contact: **hello@useluma.io**
