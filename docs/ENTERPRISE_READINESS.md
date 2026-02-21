# Enterprise Readiness — Research-Backed Reality Check

## Your Key Strategic Advantage: Safe Harbor = No PHI = Lighter Procurement

This changes everything. Per [HHS.gov](https://www.hhs.gov/hipaa/for-professionals/faq/256/is-software-vendor-business-associate/index.html):

> A software vendor is NOT a business associate if it does not have access to PHI.

Luma's Safe Harbor architecture means:
- **No BAA required** — you don't create, receive, maintain, or transmit ePHI
- **HIPAA Security Rule technical safeguards don't legally apply** to you
- **The procurement path is standard IT vendor evaluation**, not HIPAA-specific compliance
- You're evaluated like any SaaS tool (think Slack, Asana) — not like an EHR or clinical system

This is a massive advantage most health-tech startups don't have. It eliminates the hardest procurement gates.

---

## WHAT'S ACTUALLY REQUIRED — SOURCED RESEARCH

### MFA — Is it required?

**Short answer: Not for you. Not yet. But it's coming for everyone.**

- **Current HIPAA (pre-2026)**: MFA is "addressable" — meaning hospitals can skip it if they document why. It's not mandatory. ([HHS Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html))
- **2026 HIPAA Proposed Rule** (expected final May 2026, compliance ~Dec 2026): MFA becomes **mandatory for all systems accessing ePHI**. The entire "addressable vs required" distinction is being eliminated. ([HIPAA Journal](https://www.hipaajournal.com/hipaa-encryption-requirements/), [Medcurity](https://medcurity.com/hipaa-security-rule-changes-2026/), [StrongDM](https://www.strongdm.com/blog/hipaa-mfa-requirements))
- **But Luma doesn't access ePHI.** So the HIPAA MFA mandate doesn't directly apply to you. Your users enter patient name + clinical data (Safe Harbor de-identified). That's not ePHI.
- **However**: Hospital IT procurement teams may still require MFA as standard practice regardless of PHI status. It's a checkbox on their questionnaire even for non-PHI vendors.

**Verdict**: Not legally required for Luma. But ~50/50 chance a hospital asks for it anyway. Supabase has built-in TOTP support — it's a quick add if needed, not a blocker to build proactively.

### SSO/SAML — Is it required?

**Short answer: De facto yes for hospitals. 78% require it.**

- Per healthcare IT surveys, **78% of healthcare organizations now require SSO integration** from new software vendors. ([HIMSS research](https://www.valencesecurity.com/saas-security-terms/the-complete-guide-to-saas-compliance-in-2025-valence))
- This is an IT policy thing, not a legal requirement. Hospitals use identity providers (Okta, Azure AD) to manage employee access. If your tool doesn't plug into that, IT won't approve it.
- Supabase Pro supports SAML SSO. It's configuration, not custom engineering.

**Verdict**: You'll need this for any hospital deal. Not legally mandated, but IT departments gate on it. Add it when you have a signed LOI, not before.

### SOC 2 — Is it required?

**Short answer: De facto required for enterprise, but not a legal mandate.**

- SOC 2 is voluntary — no law requires it. ([Drata](https://drata.com/grc-central/soc-2/who-needs-soc-2-compliance))
- But it's become "table stakes for winning enterprise contracts" in healthcare. ([Sprinto](https://sprinto.com/blog/why-soc-2-for-saas-companies/), [AmplifyMD](https://amplifymd.com/what-is-soc-2-type-2-and-why-it-matters-for-healthcare-technology-vendors/))
- Enterprise procurement checklists at hospitals include SOC 2 as a standard expectation.
- **Cost**: $15-25K/year via platforms like Vanta or Drata. Type I takes ~3 months, Type II takes 6-12 months.
- Some smaller hospitals / independent surgical centers may waive this for a compelling product + security whitepaper.

**Verdict**: Required for Tenet/HCA-level hospital systems. Potentially waivable for independent hospitals, ASCs, and practices. Don't start SOC 2 until you have a paying hospital prospect.

### BAA — Is it required?

**Short answer: No. This is your biggest win.**

- Per [HHS.gov](https://www.hhs.gov/hipaa/for-professionals/faq/business-associates/index.html): A BAA is only required when the vendor "creates, receives, maintains, or transmits" ePHI on behalf of a covered entity.
- Luma doesn't do any of that. Patient name + clinical data under Safe Harbor ≠ PHI.
- **You should have a clear one-pager explaining your Safe Harbor architecture** for their compliance team. That's a document, not an engineering task.

**Verdict**: Not required. Prepare a Safe Harbor architecture brief so compliance teams understand why.

### Audit Logging — Is it required?

**Short answer: Legally required under current HIPAA for ePHI systems. Not legally required for Luma. But hospitals will ask.**

- Audit controls are one of the few HIPAA technical safeguards that are "required" (not "addressable") under the current rule. ([HHS](https://www.hhs.gov/sites/default/files/ocr/privacy/hipaa/administrative/securityrule/techsafeguards.pdf))
- But again — this applies to systems handling ePHI. Luma doesn't.
- Hospital procurement questionnaires still ask "do you have audit logging?" for any vendor. It's a standard security question.
- This is also genuinely useful for you: who generated what, when, for operational visibility.

**Verdict**: Not legally required, but easy to build and hospitals will ask. Good to have for your own operations too.

### HITRUST — Is it required?

**Short answer: No. Overkill for your stage.**

- HITRUST CSF certification is expensive ($50-200K+) and takes 6-12 months.
- It's expected for EHR vendors and large health-tech platforms. Not for a documentation tool that doesn't touch PHI.
- SOC 2 + a security whitepaper covers what most hospital procurement teams need.

**Verdict**: Skip entirely. Revisit at $5M+ ARR if selling to large health systems.

### EHR Integration — Is it required?

**Short answer: Not for procurement. Required for workflow adoption.**

- No hospital will reject you at procurement because you lack EHR integration.
- But providers will ask "how does this fit into my workflow?" If the answer is "copy-paste from your EHR," that's friction but not a dealbreaker for a compelling product.
- FHIR R4 read-only integration (pull patient demographics) is the minimum viable integration — and it's a funded implementation, not a pre-sale requirement.

**Verdict**: Not a procurement gate. It's a feature you scope and price into the contract.

---

## REVISED TIER LIST — WHAT YOU ACTUALLY NEED

### TIER 1: Need before first hospital demo (documentation only — no engineering)
1. **Safe Harbor Architecture Brief** — 1-page PDF explaining why no BAA is needed, how data flows, what is/isn't stored. This is the document that stops compliance teams from killing the deal.
2. **Security Whitepaper** — Overview of your stack, encryption (Supabase uses AES-256 at rest, TLS in transit), access controls, data residency.
3. **Subprocessor List** — Supabase, Vercel, Railway, Perplexity, OpenAI/Gemini, Stripe, Resend. One page.

### TIER 2: Need when a hospital sends a security questionnaire (quick engineering)
4. **Audit Logging** — Database table + middleware. Track who generated what, when, from where. 1-2 days of work.
5. **Rate Limiting** — Middleware on API routes. Prevents budget burn and shows security maturity. Half-day of work.
6. **Session Timeout** — Auto-logout after inactivity. Supabase config + frontend check. Half-day.

### TIER 3: Need when a hospital IT team says "we require this" (conditional)
7. **SSO/SAML** — Supabase Pro supports it. Configure when a specific deal requires it.
8. **MFA** — Supabase built-in TOTP + SMS. Enable when a specific deal requires it.
9. **SOC 2 Type I** — Start when you have a signed LOI from a hospital that requires it. Don't start on spec.

### TIER 4: Need for scaling past first hospital (operational)
10. **Perplexity research caching** — Cache by payer + medication + state. Saves money, improves speed.
11. **Railway resilience** — Health checks, auto-scaling config, retry/backoff.
12. **Organizations table + basic RBAC** — So a hospital admin can see all their providers' cases.

### TIER 5: Nice to have / future (don't build now)
13. HITRUST certification
14. FHIR/HL7 integration
15. SCIM provisioning
16. Public API
17. Analytics dashboard for hospital admins

---

## WHAT THIS MEANS FOR ROB ANDERSON

With Tier 1 docs (3-5 days of writing, zero engineering):
- Rob demos, loves it
- His compliance team gets the Safe Harbor brief → **BAA objection eliminated**
- His IT team gets the security whitepaper → they see encryption, data residency, no PHI stored
- If they send a questionnaire, you answer honestly: "We don't handle PHI. Here's our architecture."

**The Safe Harbor position lets you skip the hardest procurement gates.** You're not an EHR vendor. You're a documentation tool. The procurement bar is fundamentally different.

Will Tenet corporate still want SSO and SOC 2? Probably. But that's a "let's work together to get you onboarded in Q3" conversation, not a "come back when you have this" rejection. Especially if Rob is championing it internally.

---

## INFRASTRUCTURE — STILL VALID CONCERNS

The infrastructure assessment from before still holds:
- **Railway single-process** is a real scaling risk at hospital volume
- **No Perplexity caching** wastes money on identical queries
- **No rate limiting** means any user can burn your API budget

These are Tier 2-4 items. They don't block a first hospital pilot with 5-10 users. They block scaling to 50+ concurrent users.

---

## BOTTOM LINE

You asked "why do we need all that right now?" — **you don't.** Your Safe Harbor architecture means you're not held to the same standard as PHI-handling vendors. The three documents in Tier 1 are what you need before reaching out to Rob. Everything else is conditional on what his specific hospital asks for.

The original audit was grading you against the full enterprise healthcare vendor standard. That's the wrong benchmark. You should be graded against the non-PHI SaaS vendor standard, which is significantly lighter.

---

## SOURCES
- [HHS — Is a software vendor a business associate?](https://www.hhs.gov/hipaa/for-professionals/faq/256/is-software-vendor-business-associate/index.html)
- [HHS — Business Associates FAQ](https://www.hhs.gov/hipaa/for-professionals/faq/business-associates/index.html)
- [HHS — Summary of HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [HIPAA Journal — Encryption Requirements 2026](https://www.hipaajournal.com/hipaa-encryption-requirements/)
- [Medcurity — HIPAA Security Rule Changes 2026](https://medcurity.com/hipaa-security-rule-changes-2026/)
- [StrongDM — HIPAA MFA Requirements 2026](https://www.strongdm.com/blog/hipaa-mfa-requirements)
- [Twosense — HIPAA Security Rule Update on MFA](https://www.twosense.ai/blog/hipaa-security-rule-update)
- [Drata — Who Needs SOC 2](https://drata.com/grc-central/soc-2/who-needs-soc-2-compliance)
- [AmplifyMD — SOC 2 for Healthcare Tech Vendors](https://amplifymd.com/what-is-soc-2-type-2-and-why-it-matters-for-healthcare-technology-vendors/)
- [Censinet — Key Certifications for Healthcare Cloud Vendors](https://censinet.com/perspectives/key-certifications-healthcare-cloud-vendors-2025)
- [Valence — SaaS Compliance Guide 2025](https://www.valencesecurity.com/saas-security-terms/the-complete-guide-to-saas-compliance-in-2025-valence)
