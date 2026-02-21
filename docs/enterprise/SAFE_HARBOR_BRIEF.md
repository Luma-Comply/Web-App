# Luma — HIPAA Safe Harbor Architecture Brief

**Prepared for:** Hospital Compliance Teams
**Date:** February 2026
**Contact:** hello@useluma.io

---

## Overview

Luma is an AI platform that generates medical necessity documentation for prior authorizations. This brief explains how Luma's data architecture is designed to avoid handling Protected Health Information (PHI) under the HIPAA Safe Harbor de-identification standard (45 CFR § 164.514(b)(2)).

---

## What Luma Collects

| Field | Value Collected | Notes |
|---|---|---|
| Patient name | First name + last name | Used for document addressing only |
| Age | Integer age value | Converted to age group tags (pediatric / adult / geriatric) before AI processing |
| State | State of residence | No full address, city, or ZIP |
| Diagnosis codes | ICD-10 codes and descriptions | Clinical classification only |
| Disease activity | Free-text clinical notes | Provided by clinician |
| Lab values | Free-text lab results | Provided by clinician |
| Prior treatments | Free-text treatment history | Provided by clinician |
| Requested medication | Drug name and dose | |
| Payer name | Insurance payer | |

---

## What Luma Does NOT Collect

Luma never requests, stores, or processes the following HIPAA identifiers:

- Dates of birth (age is used instead)
- Social Security Number (SSN)
- Medical Record Number (MRN)
- Full address, city, ZIP code, or geographic data smaller than state
- Phone number or fax number
- Email address
- Account numbers or policy/plan beneficiary numbers
- Certificate or license numbers
- Vehicle or device identifiers and serial numbers
- Web URLs or IP addresses
- Biometric identifiers (fingerprints, voiceprints)
- Full-face photographs
- Any unique identifying number or code not listed above

---

## Why This Matters Under HIPAA

Under 45 CFR § 164.514(b)(2), health information is considered de-identified — and therefore not PHI — when all 18 HIPAA-specified identifiers have been removed or were never present.

**Luma never collects 16 of the 18 identifiers.** The two that partially apply:

- **Names**: Luma collects patient first and last name. However, name alone — without any of the other 17 identifiers — does not constitute PHI under Safe Harbor.
- **Geographic data**: Luma collects state only (not ZIP, city, or any sub-state geographic unit).

Because the combination of name + clinical data in Luma's system is not linked to any of the other 17 identifiers, this data does not meet the definition of PHI under the Safe Harbor method.

**Practical result: No Business Associate Agreement (BAA) is required between Luma and covered entities using the platform.**

---

## Data Flow

The following describes exactly how data moves through the system:

**Step 1 — Provider input**
The clinician enters patient name, age, state, diagnosis codes, clinical notes, medication, and payer name into Luma's web interface. This data is encrypted in transit via TLS 1.3 and stored in Supabase (PostgreSQL, AES-256 encryption at rest).

**Step 2 — Payer research (Perplexity API)**
Luma queries Perplexity's Sonar Pro model to retrieve current payer coverage criteria, LCD/NCD requirements, and step therapy policies.

What is sent to Perplexity:
- Payer name
- Medication name
- Patient state
- Diagnosis codes (ICD-10)
- Age group tags (e.g., "adult," "Medicare eligible") — NOT raw age
- Anonymized clinical notes excerpt (disease activity, prior treatments, lab values)

What is NOT sent to Perplexity:
- Patient name (replaced with `[PATIENT]` placeholder before any external API call)
- Date of birth, SSN, MRN, address, or any other HIPAA identifier

**Step 3 — Document generation (Google Gemini)**
Luma's generation service uses Google Gemini 2.5 Flash to generate the prior authorization letter. The patient name is replaced with the placeholder `[PATIENT]` during AI processing. The actual name is re-inserted locally after generation completes, immediately before saving to the database.

**Step 4 — Storage**
The completed document is stored in Supabase, encrypted at rest. Only the authenticated provider who created the case can access it (Row Level Security enforced at the database level).

**Step 5 — Export**
The provider downloads or copies the document for submission. Luma does not transmit the document to payers on the provider's behalf.

---

## Summary

Luma's architecture was designed from the ground up to avoid PHI. The platform does not collect the identifiers that make clinical data PHI under HIPAA Safe Harbor, and actively strips patient name from all outbound AI API calls. This eliminates BAA requirements and places Luma in the standard IT vendor procurement path rather than the HIPAA-specific track.

For questions, contact: **hello@useluma.io**
